CREATE OR REPLACE FUNCTION public.withdraw_my_application(_application_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status application_status;
BEGIN
  SELECT status INTO v_status
  FROM public.applications
  WHERE id = _application_id AND parent_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_status IN ('withdrawn','rejected','approved') THEN
    RETURN false;
  END IF;

  UPDATE public.applications
  SET status = 'withdrawn', updated_at = now()
  WHERE id = _application_id AND parent_id = auth.uid();

  UPDATE public.seat_holds
  SET released_at = now()
  WHERE application_id = _application_id AND released_at IS NULL;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_my_application(uuid) TO authenticated;

UPDATE public.applications
SET tracking_number = application_number
WHERE application_number IS NOT NULL
  AND tracking_number IS DISTINCT FROM application_number;