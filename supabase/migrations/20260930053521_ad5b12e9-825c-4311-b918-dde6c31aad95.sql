ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS allow_parent_messages boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.classroom_allows_parent_messages(_classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT allow_parent_messages FROM public.classrooms WHERE id = _classroom_id), true)
$$;

REVOKE ALL ON FUNCTION public.classroom_allows_parent_messages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classroom_allows_parent_messages(uuid) TO authenticated, service_role;

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
    OR public.classroom_allows_parent_messages(classroom_id)
  )
);