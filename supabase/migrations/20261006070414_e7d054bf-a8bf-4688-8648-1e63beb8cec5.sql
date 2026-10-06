DROP POLICY IF EXISTS "Classroom members can send messages" ON public.classroom_messages;
CREATE POLICY "Classroom members can send messages"
ON public.classroom_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.can_read_classroom_curriculum(auth.uid(), classroom_id)
  AND (
    public.is_school_staff(auth.uid())
    OR public.is_classroom_teacher(auth.uid(), classroom_id)
    OR public.is_subject_teacher(auth.uid(), classroom_id)
    OR public.classroom_allows_parent_messages(classroom_id)
  )
);
GRANT EXECUTE ON FUNCTION public.is_subject_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_classroom_curriculum(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_staff(uuid) TO authenticated;