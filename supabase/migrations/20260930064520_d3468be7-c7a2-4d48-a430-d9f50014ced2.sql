-- 1) Ready-made message templates
CREATE TABLE public.chat_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_templates_classroom ON public.chat_message_templates (classroom_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_templates TO authenticated;
GRANT ALL ON public.chat_message_templates TO service_role;

ALTER TABLE public.chat_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and teachers read message templates"
  ON public.chat_message_templates FOR SELECT TO authenticated
  USING (public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid()));

CREATE POLICY "Staff and teachers create message templates"
  ON public.chat_message_templates FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid()))
  );

CREATE POLICY "Owners and staff update message templates"
  ON public.chat_message_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_school_staff(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_school_staff(auth.uid()));

CREATE POLICY "Owners and staff delete message templates"
  ON public.chat_message_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_school_staff(auth.uid()));

CREATE TRIGGER update_chat_message_templates_updated_at
  BEFORE UPDATE ON public.chat_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Private chats keyed to the child, so a teacher may start before the guardian is linked
ALTER TABLE public.private_chats
  ADD COLUMN child_id uuid REFERENCES public.application_children(id) ON DELETE CASCADE;

ALTER TABLE public.private_chats ALTER COLUMN parent_id DROP NOT NULL;

CREATE UNIQUE INDEX idx_private_chats_child
  ON public.private_chats (class_id, teacher_id, child_id)
  WHERE child_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_access_private_chat(_user_id uuid, _chat_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.private_chats c
    WHERE c.id = _chat_id
      AND (
        c.teacher_id = _user_id
        OR c.parent_id = _user_id
        OR (c.child_id IS NOT NULL AND public.is_child_parent(_user_id, c.child_id))
        OR public.is_school_staff(_user_id)
      )
  )
$function$;

DROP POLICY "Parents read their private chats" ON public.private_chats;
CREATE POLICY "Parents read their private chats"
  ON public.private_chats FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR (child_id IS NOT NULL AND public.is_child_parent(auth.uid(), child_id))
  );

DROP POLICY "Teachers open private chats with their classroom parents" ON public.private_chats;
CREATE POLICY "Teachers open private chats with their classroom parents"
  ON public.private_chats FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.is_classroom_teacher(auth.uid(), class_id)
    AND (
      (parent_id IS NOT NULL AND public.parent_has_child_in_classroom(parent_id, class_id))
      OR (child_id IS NOT NULL AND public.child_classroom_id(child_id) = class_id)
    )
  );

CREATE POLICY "Teachers update private chats of their classrooms"
  ON public.private_chats FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() AND public.is_classroom_teacher(auth.uid(), class_id))
  WITH CHECK (teacher_id = auth.uid() AND public.is_classroom_teacher(auth.uid(), class_id));

DROP POLICY "Members send private messages" ON public.private_messages;
CREATE POLICY "Members send private messages"
  ON public.private_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.can_access_private_chat(auth.uid(), chat_id)
    AND NOT public.is_school_staff(auth.uid())
  );