INSERT INTO public.permissions (key, description_ar, category) VALUES
  ('inbox.view', 'الاطلاع على المراسلات والتقييمات الواردة', 'settings'),
  ('inbox.reply', 'الرد على المراسلات عبر واتساب أو البريد', 'settings'),
  ('inbox.status', 'تغيير حالة المراسلة ودرجة أهميتها', 'settings'),
  ('inbox.note', 'كتابة الملاحظات الداخلية على المراسلات', 'settings'),
  ('inbox.export', 'تصدير المراسلات إلى ملف CSV', 'settings'),
  ('inbox.delete', 'حذف المراسلات نهائيًا', 'settings'),
  ('reviews.moderate', 'اعتماد أو رفض أو حذف تقييمات أولياء الأمور', 'settings')
ON CONFLICT (key) DO UPDATE SET description_ar = EXCLUDED.description_ar, category = EXCLUDED.category;

INSERT INTO public.role_permissions (role, permission_key)
SELECT v.r::public.app_role, v.k FROM (VALUES
  ('admin','inbox.view'),('admin','inbox.reply'),('admin','inbox.status'),('admin','inbox.note'),('admin','inbox.export'),('admin','inbox.delete'),('admin','reviews.moderate'),
  ('supervisor','inbox.view'),('supervisor','inbox.reply'),('supervisor','inbox.status'),('supervisor','inbox.note'),('supervisor','inbox.export'),('supervisor','inbox.delete'),('supervisor','reviews.moderate'),
  ('principal','inbox.view'),('principal','inbox.reply'),('principal','inbox.status'),('principal','inbox.note'),('principal','inbox.export'),('principal','inbox.delete'),('principal','reviews.moderate'),
  ('registration_officer','inbox.view'),('registration_officer','inbox.reply'),('registration_officer','inbox.status'),('registration_officer','inbox.note'),
  ('accountant','inbox.view')
) AS v(r, k)
ON CONFLICT DO NOTHING;

CREATE TABLE public.inbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('message','testimonial')),
  subject_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  actor_name text,
  action text NOT NULL,
  from_value text,
  to_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inbox_events_subject_idx ON public.inbox_events (subject_type, subject_id, created_at DESC);

GRANT SELECT, INSERT ON public.inbox_events TO authenticated;
GRANT ALL ON public.inbox_events TO service_role;

ALTER TABLE public.inbox_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read inbox events" ON public.inbox_events
FOR SELECT TO authenticated USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff can log their own inbox events" ON public.inbox_events
FOR INSERT TO authenticated WITH CHECK (public.is_school_staff(auth.uid()) AND actor_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_testimonials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_events;