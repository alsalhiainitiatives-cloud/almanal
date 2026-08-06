CREATE OR REPLACE FUNCTION public.duplicate_child_national_ids(
  _ids text[],
  _academic_year text,
  _ignore_reservation uuid DEFAULT NULL,
  _ignore_application uuid DEFAULT NULL
)
RETURNS TABLE(national_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT x.national_id FROM (
    SELECT c.national_id
    FROM public.seat_reservation_children c
    JOIN public.seat_reservations r ON r.id = c.reservation_id
    WHERE auth.uid() IS NOT NULL
      AND c.national_id = ANY(_ids)
      AND r.academic_year = _academic_year
      AND r.status IN ('pending_review', 'approved')
      AND (_ignore_reservation IS NULL OR r.id <> _ignore_reservation)
    UNION ALL
    SELECT ac.national_id
    FROM public.application_children ac
    JOIN public.applications a ON a.id = ac.application_id
    WHERE auth.uid() IS NOT NULL
      AND ac.national_id = ANY(_ids)
      AND a.academic_year = _academic_year
      AND a.status NOT IN ('withdrawn', 'rejected')
      AND (_ignore_application IS NULL OR a.id <> _ignore_application)
  ) x
  WHERE x.national_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.duplicate_child_national_ids(text[], text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_child_national_ids(text[], text, uuid, uuid) TO authenticated, service_role;