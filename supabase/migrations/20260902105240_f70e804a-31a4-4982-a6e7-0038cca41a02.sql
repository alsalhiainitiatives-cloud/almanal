CREATE OR REPLACE FUNCTION public.claim_child_by_identifier(_identifier text)
RETURNS TABLE(child_names text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_raw text := upper(trim(COALESCE(_identifier, '')));
  v_digits text := regexp_replace(COALESCE(_identifier, ''), '[^0-9]', '', 'g');
  v_app_id uuid;
  v_owner uuid;
  v_names text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(v_raw) < 5 THEN RAISE EXCEPTION 'identifier_too_short'; END IF;

  SELECT a.id, a.parent_id INTO v_app_id, v_owner
  FROM public.application_children c
  JOIN public.applications a ON a.id = c.application_id
  WHERE a.status = 'approved'
    AND (
      (length(v_digits) >= 8 AND regexp_replace(COALESCE(c.national_id, ''), '[^0-9]', '', 'g') = v_digits)
      OR upper(trim(COALESCE(a.student_number, ''))) = v_raw
      OR upper(trim(COALESCE(a.application_number, ''))) = v_raw
    )
  ORDER BY c.created_at
  LIMIT 1;

  IF v_app_id IS NULL THEN RAISE EXCEPTION 'child_not_found'; END IF;

  IF v_owner = v_uid THEN
    SELECT COALESCE(array_agg(c.name_ar ORDER BY c.name_ar), '{}') INTO v_names
    FROM public.application_children c WHERE c.application_id = v_app_id;
    RETURN QUERY SELECT v_names;
    RETURN;
  END IF;

  IF v_owner IS NOT NULL AND NOT public.is_school_staff(v_owner) THEN
    RAISE EXCEPTION 'already_linked';
  END IF;

  UPDATE public.applications SET parent_id = v_uid, updated_at = now() WHERE id = v_app_id;

  UPDATE public.parent_invitations
  SET status = 'accepted', accepted_by = v_uid, accepted_at = now(), updated_at = now()
  WHERE application_id = v_app_id AND status = 'pending';

  SELECT COALESCE(array_agg(c.name_ar ORDER BY c.name_ar), '{}') INTO v_names
  FROM public.application_children c WHERE c.application_id = v_app_id;

  RETURN QUERY SELECT v_names;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_child_by_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_child_by_identifier(text) TO authenticated;