-- 1) New workflow statuses
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'principal_review';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'waitlisted';

-- 2) Applications: operational columns
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS assigned_officer_id uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS seat_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS student_number text,
  ADD COLUMN IF NOT EXISTS officer_recommendation text,
  ADD COLUMN IF NOT EXISTS decided_by uuid,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS applications_status_idx ON public.applications (status);
CREATE INDEX IF NOT EXISTS applications_officer_idx ON public.applications (assigned_officer_id);
CREATE INDEX IF NOT EXISTS applications_submitted_idx ON public.applications (submitted_at DESC);

-- 3) Document review metadata
ALTER TABLE public.application_documents
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 4) Internal / confidential / parent-facing notes
CREATE TABLE IF NOT EXISTS public.application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal','confidential','parent')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  mentions uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_notes TO authenticated;
GRANT ALL ON public.application_notes TO service_role;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes readable" ON public.application_notes
FOR SELECT TO authenticated
USING (
  (visibility = 'parent' AND EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = application_id AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
  ))
  OR (visibility = 'internal' AND public.is_school_staff(auth.uid()))
  OR (visibility = 'confidential' AND (
        public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'admin')
     ))
);

CREATE POLICY "notes insert" ON public.application_notes
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND NOT public.has_role(auth.uid(), 'supervisor')
  AND (
    (visibility = 'parent' AND EXISTS (
       SELECT 1 FROM public.applications a
       WHERE a.id = application_id AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
    ))
    OR (visibility = 'internal' AND public.is_school_staff(auth.uid()))
    OR (visibility = 'confidential' AND (
          public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'admin')
       ))
  )
);

CREATE POLICY "notes author update" ON public.application_notes
FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "notes author delete" ON public.application_notes
FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_application_notes_updated_at
BEFORE UPDATE ON public.application_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Missing-document requests
CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  child_index integer,
  document_type_slug text NOT NULL,
  note text,
  requested_by uuid NOT NULL,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_requests TO authenticated;
GRANT ALL ON public.document_requests TO service_role;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc requests read" ON public.document_requests
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.applications a
  WHERE a.id = application_id AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
));

CREATE POLICY "doc requests staff write" ON public.document_requests
FOR ALL TO authenticated
USING (public.is_school_staff(auth.uid()) AND NOT public.has_role(auth.uid(), 'supervisor'))
WITH CHECK (public.is_school_staff(auth.uid()) AND NOT public.has_role(auth.uid(), 'supervisor'));

CREATE TRIGGER update_document_requests_updated_at
BEFORE UPDATE ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Waiting list
CREATE TABLE IF NOT EXISTS public.waiting_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.application_children(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','offered','placed','cancelled')),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waiting_list_entries TO authenticated;
GRANT ALL ON public.waiting_list_entries TO service_role;
ALTER TABLE public.waiting_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist read" ON public.waiting_list_entries
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.applications a
  WHERE a.id = application_id AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
));

CREATE POLICY "waitlist staff write" ON public.waiting_list_entries
FOR ALL TO authenticated
USING (public.is_school_staff(auth.uid()) AND NOT public.has_role(auth.uid(), 'supervisor'))
WITH CHECK (public.is_school_staff(auth.uid()) AND NOT public.has_role(auth.uid(), 'supervisor'));

CREATE TRIGGER update_waiting_list_updated_at
BEFORE UPDATE ON public.waiting_list_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Pinned / favourite applications per staff member
CREATE TABLE IF NOT EXISTS public.application_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.application_pins TO authenticated;
GRANT ALL ON public.application_pins TO service_role;
ALTER TABLE public.application_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pins own" ON public.application_pins
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 8) Staff need to read parent profiles inside the workspace
CREATE POLICY "Staff can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_school_staff(auth.uid()));

-- 9) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.application_documents;