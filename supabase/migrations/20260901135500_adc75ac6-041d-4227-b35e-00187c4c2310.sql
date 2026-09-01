CREATE POLICY "Teachers can read children in their classrooms"
ON public.application_children
FOR SELECT
TO authenticated
USING (
  classroom_id IS NOT NULL
  AND public.is_classroom_teacher(auth.uid(), classroom_id)
);