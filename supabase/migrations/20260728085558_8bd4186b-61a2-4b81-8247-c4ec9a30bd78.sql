CREATE TABLE public.form_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  short_ar text NOT NULL,
  description_ar text,
  icon text NOT NULL DEFAULT 'Sparkles',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.form_steps(id) ON DELETE CASCADE,
  key text NOT NULL,
  label_ar text NOT NULL,
  help_ar text,
  placeholder_ar text,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  applies_to text NOT NULL DEFAULT 'application',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, key)
);

GRANT SELECT ON public.form_steps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_steps TO authenticated;
GRANT ALL ON public.form_steps TO service_role;

GRANT SELECT ON public.form_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_fields TO authenticated;
GRANT ALL ON public.form_fields TO service_role;

ALTER TABLE public.form_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form steps readable" ON public.form_steps
  FOR SELECT USING (is_active OR public.is_school_staff(auth.uid()));
CREATE POLICY "form steps managed by admins" ON public.form_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "form fields readable" ON public.form_fields
  FOR SELECT USING (is_visible OR public.is_school_staff(auth.uid()));
CREATE POLICY "form fields managed by admins" ON public.form_fields
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "document types managed by admins" ON public.document_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE TRIGGER update_form_steps_updated_at BEFORE UPDATE ON public.form_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON public.form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.form_steps REPLICA IDENTITY FULL;
ALTER TABLE public.form_fields REPLICA IDENTITY FULL;
ALTER TABLE public.document_types REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_fields;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_types;

INSERT INTO public.form_steps (key, name_ar, short_ar, description_ar, icon, sort_order, is_system) VALUES
  ('parent',    'بيانات ولي الأمر',   'ولي الأمر',  'الهوية والجنسية وبيانات التواصل والعنوان الوطني.', 'UserRound', 1, true),
  ('children',  'بيانات الأبناء',     'الأبناء',    'بيانات كل طفل مع حساب العمر وتحديد المرحلة والفصول المفضلة.', 'Baby', 2, true),
  ('qurra',     'برنامج قرة',         'قرة',        'تأكيد طلب دعم قرة للأمهات السعوديات العاملات.', 'HeartHandshake', 3, true),
  ('services',  'الخدمات الإضافية',   'الخدمات',    'اختر النقل والوجبات والأنشطة التي تناسب أسرتك.', 'Sparkles', 4, true),
  ('documents', 'المستندات المطلوبة', 'المستندات',  'ارفع المستندات المطلوبة بصيغة PDF أو صورة واضحة.', 'FileText', 5, true),
  ('review',    'مراجعة الطلب',       'المراجعة',   'راجع كل البيانات قبل الإرسال النهائي.', 'ClipboardCheck', 6, true),
  ('financial', 'الملخص المالي',      'المالية',    'رسوم القبول والرسوم الدراسية والخدمات المختارة.', 'Wallet', 7, true);

INSERT INTO public.form_fields (step_id, key, label_ar, field_type, is_required, is_system, sort_order)
SELECT s.id, f.key, f.label_ar, f.field_type, f.is_required, true, f.sort_order
FROM public.form_steps s
JOIN (VALUES
  ('parent','fullName','الاسم الرباعي','text',true,1),
  ('parent','nationalId','رقم الهوية / الإقامة','text',true,2),
  ('parent','nationality','الجنسية','select',true,3),
  ('parent','relationship','صلة القرابة','select',true,4),
  ('parent','phone','رقم الجوال','phone',true,5),
  ('parent','email','البريد الإلكتروني','email',false,6),
  ('parent','city','المدينة','text',true,7),
  ('parent','district','الحي','text',false,8),
  ('children','name_ar','اسم الطفل','text',true,1),
  ('children','birth_date','تاريخ الميلاد','date',true,2),
  ('children','gender','الجنس','select',true,3),
  ('children','nationality','جنسية الطفل','select',true,4),
  ('children','national_id','رقم هوية الطفل','text',false,5),
  ('children','medical_conditions','حالات صحية','textarea',false,6),
  ('qurra','requested','طلب دعم برنامج قرة','checkbox',false,1),
  ('qurra','mother_national_id','هوية الأم','text',false,2),
  ('qurra','mother_employer','جهة عمل الأم','text',false,3)
) AS f(step_key, key, label_ar, field_type, is_required, sort_order)
  ON f.step_key = s.key;