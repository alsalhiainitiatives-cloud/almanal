DROP POLICY "Members send private messages" ON public.private_messages;
CREATE POLICY "Members send private messages"
  ON public.private_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.private_chats c
      WHERE c.id = private_messages.chat_id
        AND (
          c.teacher_id = auth.uid()
          OR c.parent_id = auth.uid()
          OR (c.child_id IS NOT NULL AND public.is_child_parent(auth.uid(), c.child_id))
        )
    )
  );