CREATE OR REPLACE FUNCTION public.next_academic_number(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text := upper(trim(coalesce(_prefix, '')));
  v_next integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_school_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_prefix !~ '^MN-[0-9]-[0-9]{2}$' THEN
    RAISE EXCEPTION 'invalid_prefix';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('academic_number:' || v_prefix));

  SELECT COALESCE(MAX((regexp_replace(a.student_number, '^.*-', ''))::integer), 0) + 1
  INTO v_next
  FROM public.applications a
  WHERE a.student_number LIKE v_prefix || '-%'
    AND a.student_number ~ ('^' || v_prefix || '-[0-9]{3,}$');

  RETURN v_prefix || '-' || lpad(v_next::text, 3, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_academic_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_academic_number(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_academic_number(text) TO service_role;