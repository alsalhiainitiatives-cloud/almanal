-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(right(regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g'), 9), '');
$$;

-- ============ parent invitations ============
CREATE TABLE public.parent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.application_children(id) ON DELETE SET NULL,
  parent_name text,
  parent_phone text NOT NULL,
  parent_email text,
  parent_national_id text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '60 days',
  created_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX parent_invitations_app_idx ON public.parent_invitations(application_id);
CREATE INDEX parent_invitations_phone_idx ON public.parent_invitations(public.normalize_phone(parent_phone));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_invitations TO authenticated;
GRANT ALL ON public.parent_invitations TO service_role;

ALTER TABLE public.parent_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage parent invitations"
ON public.parent_invitations FOR ALL TO authenticated
USING (public.is_school_staff(auth.uid()))
WITH CHECK (public.is_school_staff(auth.uid()));

CREATE TRIGGER parent_invitations_updated
BEFORE UPDATE ON public.parent_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public, token-gated preview (masked child name only).
CREATE OR REPLACE FUNCTION public.parent_invitation_preview(_token text)
RETURNS TABLE(child_name text, parent_name text, phone_tail text, siblings integer, status text, expired boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv public.parent_invitations%ROWTYPE;
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 16 THEN
    RETURN;
  END IF;

  SELECT * INTO v_inv FROM public.parent_invitations i
  WHERE i.token = lower(trim(_token)) LIMIT 1;
  IF v_inv.id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT c.name_ar FROM public.application_children c WHERE c.id = v_inv.child_id), 'الطالب'),
    v_inv.parent_name,
    right(regexp_replace(COALESCE(v_inv.parent_phone, ''), '[^0-9]', '', 'g'), 4),
    (SELECT count(*)::int FROM public.parent_invitations s
      WHERE s.status = 'pending'
        AND s.expires_at > now()
        AND public.normalize_phone(s.parent_phone) = public.normalize_phone(v_inv.parent_phone)),
    v_inv.status,
    (v_inv.expires_at <= now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.parent_invitation_preview(text) TO anon, authenticated;

-- Signed-in guardian claims the invitation; all siblings sharing the phone/ID link too.
CREATE OR REPLACE FUNCTION public.claim_parent_invitation(_token text)
RETURNS TABLE(linked integer, child_names text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv public.parent_invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_apps uuid[];
  v_names text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_inv FROM public.parent_invitations i
  WHERE i.token = lower(trim(COALESCE(_token, ''))) LIMIT 1;

  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
  IF v_inv.status = 'revoked' THEN RAISE EXCEPTION 'invitation_revoked'; END IF;
  IF v_inv.expires_at <= now() THEN RAISE EXCEPTION 'invitation_expired'; END IF;

  SELECT COALESCE(array_agg(i.id), '{}'), COALESCE(array_agg(DISTINCT i.application_id), '{}')
  INTO v_ids, v_apps
  FROM public.parent_invitations i
  WHERE i.status = 'pending'
    AND i.expires_at > now()
    AND (
      public.normalize_phone(i.parent_phone) = public.normalize_phone(v_inv.parent_phone)
      OR (
        v_inv.parent_national_id IS NOT NULL
        AND length(trim(v_inv.parent_national_id)) >= 8
        AND trim(i.parent_national_id) = trim(v_inv.parent_national_id)
      )
    );

  IF array_length(v_apps, 1) IS NULL THEN
    v_apps := ARRAY[v_inv.application_id];
    v_ids := ARRAY[v_inv.id];
  END IF;

  UPDATE public.applications a
  SET parent_id = v_uid, updated_at = now()
  WHERE a.id = ANY(v_apps);

  UPDATE public.parent_invitations i
  SET status = 'accepted', accepted_by = v_uid, accepted_at = now(), updated_at = now()
  WHERE i.id = ANY(v_ids);

  UPDATE public.profiles p
  SET full_name = COALESCE(NULLIF(trim(p.full_name), ''), v_inv.parent_name),
      phone = COALESCE(NULLIF(trim(p.phone), ''), v_inv.parent_phone),
      updated_at = now()
  WHERE p.id = v_uid;

  SELECT COALESCE(array_agg(c.name_ar ORDER BY c.name_ar), '{}') INTO v_names
  FROM public.application_children c WHERE c.application_id = ANY(v_apps);

  RETURN QUERY SELECT COALESCE(array_length(v_names, 1), 0), v_names;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_parent_invitation(text) TO authenticated;

-- ============ attendance ============
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  attendance_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'present',
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, attendance_date)
);

CREATE INDEX attendance_classroom_date_idx ON public.attendance_records(classroom_id, attendance_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read attendance for own scope"
ON public.attendance_records FOR SELECT TO authenticated
USING (
  public.is_school_staff(auth.uid())
  OR public.is_teacher_of_child(auth.uid(), child_id)
  OR public.is_child_parent(auth.uid(), child_id)
);

CREATE POLICY "Staff and teachers write attendance"
ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (public.is_school_staff(auth.uid()) OR public.is_teacher_of_child(auth.uid(), child_id));

CREATE POLICY "Staff and teachers update attendance"
ON public.attendance_records FOR UPDATE TO authenticated
USING (public.is_school_staff(auth.uid()) OR public.is_teacher_of_child(auth.uid(), child_id))
WITH CHECK (public.is_school_staff(auth.uid()) OR public.is_teacher_of_child(auth.uid(), child_id));

CREATE POLICY "Staff and teachers delete attendance"
ON public.attendance_records FOR DELETE TO authenticated
USING (public.is_school_staff(auth.uid()) OR public.is_teacher_of_child(auth.uid(), child_id));

CREATE TRIGGER attendance_records_updated
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();