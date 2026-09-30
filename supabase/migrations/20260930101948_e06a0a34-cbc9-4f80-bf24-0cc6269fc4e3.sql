CREATE OR REPLACE FUNCTION public.classroom_enrolled_children(_classroom_id uuid)
 RETURNS TABLE(id uuid, name_ar text, gender text, student_number text, parent_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.name_ar,
    c.gender,
    a.student_number,
    a.parent_id
  FROM public.application_children c
  JOIN public.applications a ON a.id = c.application_id
  WHERE c.classroom_id = _classroom_id
    AND c.withdrawn_at IS NULL
    AND a.status = 'approved'
    AND (
      public.is_school_staff(auth.uid())
      OR public.is_classroom_teacher(auth.uid(), _classroom_id)
      OR EXISTS (
        SELECT 1
        FROM public.teacher_subjects ts
        JOIN public.subjects s ON s.id = ts.subject_id
        WHERE ts.teacher_id = auth.uid()
          AND s.classroom_id = _classroom_id
      )
    )
  ORDER BY c.name_ar;
$function$;