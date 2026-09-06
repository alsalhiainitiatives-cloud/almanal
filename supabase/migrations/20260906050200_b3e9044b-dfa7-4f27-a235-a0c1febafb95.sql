-- Phase 10: private 1-on-1 chats between teachers and parents

CREATE TABLE public.private_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, teacher_id, parent_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_chats TO authenticated;
GRANT ALL ON public.private_chats TO service_role;

CREATE INDEX idx_private_chats_teacher ON public.private_chats(teacher_id);
CREATE INDEX idx_private_chats_parent ON public.private_chats(parent_id);
CREATE INDEX idx_private_chats_class ON public.private_chats(class_id);

CREATE TABLE public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  text text NOT NULL DEFAULT '',
  attachment_url text,
  attachment_type text,
  attachment_name text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.private_messages TO authenticated;
GRANT ALL ON public.private_messages TO service_role;

CREATE INDEX idx_private_messages_chat ON public.private_messages(chat_id, created_at DESC);

-- Membership helper (security definer avoids recursive policy evaluation)
CREATE OR REPLACE FUNCTION public.can_access_private_chat(_user_id uuid, _chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.private_chats c
    WHERE c.id = _chat_id
      AND (
        c.teacher_id = _user_id
        OR c.parent_id = _user_id
        OR public.is_school_staff(_user_id)
      )
  )
$$;

ALTER TABLE public.private_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Parents: only with a teacher assigned to their own child's classroom
CREATE POLICY "Parents read their private chats"
ON public.private_chats FOR SELECT TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "Parents open private chats with their child's teacher"
ON public.private_chats FOR INSERT TO authenticated
WITH CHECK (
  parent_id = auth.uid()
  AND public.parent_has_child_in_classroom(auth.uid(), class_id)
  AND public.is_classroom_teacher(teacher_id, class_id)
);

-- Teachers: only with parents of children in their assigned classrooms
CREATE POLICY "Teachers read private chats of their classrooms"
ON public.private_chats FOR SELECT TO authenticated
USING (teacher_id = auth.uid() AND public.is_classroom_teacher(auth.uid(), class_id));

CREATE POLICY "Teachers open private chats with their classroom parents"
ON public.private_chats FOR INSERT TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND public.is_classroom_teacher(auth.uid(), class_id)
  AND public.parent_has_child_in_classroom(parent_id, class_id)
);

CREATE POLICY "Staff moderate private chats"
ON public.private_chats FOR SELECT TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff delete private chats"
ON public.private_chats FOR DELETE TO authenticated
USING (public.is_school_staff(auth.uid()));

-- Messages follow chat membership
CREATE POLICY "Members read private messages"
ON public.private_messages FOR SELECT TO authenticated
USING (public.can_access_private_chat(auth.uid(), chat_id));

CREATE POLICY "Members send private messages"
ON public.private_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.private_chats c
    WHERE c.id = chat_id AND (c.teacher_id = auth.uid() OR c.parent_id = auth.uid())
  )
);

CREATE POLICY "Senders soft delete their private messages"
ON public.private_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Staff delete private messages"
ON public.private_messages FOR DELETE TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE TRIGGER update_private_chats_updated_at
BEFORE UPDATE ON public.private_chats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;

-- RBAC registry
INSERT INTO public.permissions (key, category, module_name, sub_module_name, action, description_ar, sort_order)
VALUES
  ('private_chat.view', 'communications', 'communications', 'private_chat', 'read', 'الاطلاع على الرسائل الخاصة', 610),
  ('private_chat.post', 'communications', 'communications', 'private_chat', 'create', 'إرسال رسائل خاصة ومرفقاتها', 611),
  ('private_chat.wipe', 'communications', 'communications', 'private_chat', 'delete', 'مسح المحادثات الخاصة', 612),
  ('private_chat.media_delete', 'communications', 'communications', 'private_chat', 'delete', 'حذف مرفقات المحادثات الخاصة', 613)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
SELECT r.role, p.key
FROM (VALUES ('admin'::app_role), ('supervisor'::app_role), ('principal'::app_role)) AS r(role),
     (VALUES ('private_chat.view'), ('private_chat.post'), ('private_chat.wipe'), ('private_chat.media_delete')) AS p(key)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
SELECT r.role, p.key
FROM (VALUES ('teacher'::app_role), ('parent'::app_role)) AS r(role),
     (VALUES ('private_chat.view'), ('private_chat.post')) AS p(key)
ON CONFLICT DO NOTHING;