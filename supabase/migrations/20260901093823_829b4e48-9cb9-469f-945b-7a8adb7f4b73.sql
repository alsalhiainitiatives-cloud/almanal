CREATE TABLE public.classroom_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  parent_message_id uuid REFERENCES public.classroom_messages(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text,
  sender_role text NOT NULL DEFAULT 'parent',
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_classroom_messages_room ON public.classroom_messages (classroom_id, created_at DESC);
CREATE INDEX idx_classroom_messages_thread ON public.classroom_messages (parent_message_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_messages TO authenticated;
GRANT ALL ON public.classroom_messages TO service_role;

ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classroom members can read messages"
ON public.classroom_messages FOR SELECT TO authenticated
USING (public.can_read_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "Classroom members can send messages"
ON public.classroom_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.can_read_classroom_curriculum(auth.uid(), classroom_id)
);

CREATE POLICY "Authors can edit their messages"
ON public.classroom_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Authors and staff can delete messages"
ON public.classroom_messages FOR DELETE TO authenticated
USING (sender_id = auth.uid() OR public.is_school_staff(auth.uid()));

CREATE TRIGGER classroom_messages_updated
BEFORE UPDATE ON public.classroom_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_messages;

CREATE POLICY "Members can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'chat'
  AND public.can_read_classroom_curriculum(auth.uid(), ((storage.foldername(name))[2])::uuid)
);