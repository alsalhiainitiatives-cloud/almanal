CREATE OR REPLACE FUNCTION public.classroom_enrolled_children(_classroom_id uuid)
RETURNS TABLE (
  id uuid,
  name_ar text,
  gender text,
  student_number text,
  parent_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name_ar,
    c.gender,
    a.student_number,
    a.parent_id
  FROM public.application_children c
  JOIN public.applications a ON a.id = c.application_id
  WHERE c.classroom_id = _classroom_id
    AND a.status = 'approved'
    AND (
      public.is_school_staff(auth.uid())
      OR public.is_classroom_teacher(auth.uid(), _classroom_id)
    )
  ORDER BY c.name_ar;
$$;

REVOKE ALL ON FUNCTION public.classroom_enrolled_children(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.classroom_enrolled_children(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.classroom_enrolled_children(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.classroom_enrolled_children(uuid) TO service_role;