-- ============ helper ============
CREATE OR REPLACE FUNCTION public.is_school_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('registration_officer','accountant','principal','supervisor','admin')
  );
$$;

-- ============ enums ============
CREATE TYPE public.application_status AS ENUM (
  'draft','submitted','under_review','needs_action','approved','rejected','withdrawn'
);
CREATE TYPE public.qurra_status AS ENUM (
  'eligible','waiting_school_review','submitted_to_qurra','waiting_response','approved','rejected','not_requested'
);
CREATE TYPE public.service_category AS ENUM (
  'transportation','uniform','books','meals','activities','other'
);

-- ============ stages ============
CREATE TABLE public.stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  tagline_ar text,
  age_label text NOT NULL,
  min_age_months int NOT NULL DEFAULT 0,
  max_age_months int NOT NULL DEFAULT 144,
  philosophy_ar text,
  learning_approach_ar text,
  operating_hours text,
  teacher_ratio text,
  tuition_from numeric(10,2) NOT NULL DEFAULT 0,
  admission_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_seats int NOT NULL DEFAULT 0,
  taken_seats int NOT NULL DEFAULT 0,
  hero_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  facilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  teachers jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone text NOT NULL DEFAULT 'rose',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stages TO anon, authenticated;
GRANT ALL ON public.stages TO service_role;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages public read" ON public.stages FOR SELECT USING (is_active);
CREATE POLICY "stages staff manage" ON public.stages FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid())) WITH CHECK (public.is_school_staff(auth.uid()));
CREATE TRIGGER trg_stages_updated BEFORE UPDATE ON public.stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ classrooms ============
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  color_hex text NOT NULL DEFAULT '#7A1F3D',
  color_label text,
  teacher_name text,
  teacher_title text,
  capacity int NOT NULL DEFAULT 20,
  taken_seats int NOT NULL DEFAULT 0,
  min_age_months int NOT NULL DEFAULT 0,
  max_age_months int NOT NULL DEFAULT 144,
  description_ar text,
  learning_style_ar text,
  schedule_ar text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classrooms TO anon, authenticated;
GRANT ALL ON public.classrooms TO service_role;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classrooms public read" ON public.classrooms FOR SELECT USING (is_active);
CREATE POLICY "classrooms staff manage" ON public.classrooms FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid())) WITH CHECK (public.is_school_staff(auth.uid()));
CREATE TRIGGER trg_classrooms_updated BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ services ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text,
  category public.service_category NOT NULL DEFAULT 'other',
  price numeric(10,2) NOT NULL DEFAULT 0,
  price_note text,
  is_required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services public read" ON public.services FOR SELECT USING (is_active);
CREATE POLICY "services staff manage" ON public.services FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid())) WITH CHECK (public.is_school_staff(auth.uid()));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ document types ============
CREATE TABLE public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  description_ar text,
  is_required boolean NOT NULL DEFAULT true,
  applies_to_nationality text NOT NULL DEFAULT 'all',
  applies_to_stage_slug text,
  requires_medical boolean NOT NULL DEFAULT false,
  requires_service_slug text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_types TO anon, authenticated;
GRANT ALL ON public.document_types TO service_role;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_types public read" ON public.document_types FOR SELECT USING (is_active);
CREATE POLICY "document_types staff manage" ON public.document_types FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid())) WITH CHECK (public.is_school_staff(auth.uid()));
CREATE TRIGGER trg_document_types_updated BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ applications ============
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  academic_year text NOT NULL DEFAULT '1447',
  status public.application_status NOT NULL DEFAULT 'draft',
  current_step int NOT NULL DEFAULT 1,
  application_number text UNIQUE,
  tracking_number text UNIQUE,
  draft_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  parent_national_id text,
  parent_nationality text,
  admission_fee numeric(10,2) NOT NULL DEFAULT 0,
  tuition_total numeric(10,2) NOT NULL DEFAULT 0,
  services_total numeric(10,2) NOT NULL DEFAULT 0,
  discount_total numeric(10,2) NOT NULL DEFAULT 0,
  grand_total numeric(10,2) NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_applications_parent ON public.applications(parent_id);
CREATE INDEX idx_applications_status ON public.applications(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications owner read" ON public.applications FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR public.is_school_staff(auth.uid()));
CREATE POLICY "applications owner insert" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());
CREATE POLICY "applications owner update" ON public.applications FOR UPDATE TO authenticated
  USING ((parent_id = auth.uid() AND status IN ('draft','needs_action')) OR public.is_school_staff(auth.uid()))
  WITH CHECK (parent_id = auth.uid() OR public.is_school_staff(auth.uid()));
CREATE POLICY "applications owner delete" ON public.applications FOR DELETE TO authenticated
  USING (parent_id = auth.uid() AND status = 'draft');
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ children ============
CREATE TABLE public.application_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  national_id text,
  gender text,
  birth_date date,
  nationality text,
  birth_place text,
  photo_url text,
  blood_type text,
  medical_conditions text,
  allergies text,
  special_needs text,
  previous_school text,
  last_grade text,
  vaccination_status text,
  stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_children_app ON public.application_children(application_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_children TO authenticated;
GRANT ALL ON public.application_children TO service_role;
ALTER TABLE public.application_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children access" ON public.application_children FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE TRIGGER trg_children_updated BEFORE UPDATE ON public.application_children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- duplicate application prevention handled at the application layer

-- ============ application services ============
CREATE TABLE public.application_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price_at_selection numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_services TO authenticated;
GRANT ALL ON public.application_services TO service_role;
ALTER TABLE public.application_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app services access" ON public.application_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));

-- ============ documents ============
CREATE TABLE public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type_slug text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  file_size int,
  status text NOT NULL DEFAULT 'uploaded',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_app ON public.application_documents(application_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app docs access" ON public.application_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.application_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ qurra ============
CREATE TABLE public.qurra_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  requested boolean NOT NULL DEFAULT false,
  status public.qurra_status NOT NULL DEFAULT 'not_requested',
  declaration_accepted boolean NOT NULL DEFAULT false,
  mother_national_id text,
  mother_employment_status text,
  mother_employer text,
  mother_job_title text,
  notes text,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qurra_requests TO authenticated;
GRANT ALL ON public.qurra_requests TO service_role;
ALTER TABLE public.qurra_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qurra access" ON public.qurra_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE TRIGGER trg_qurra_updated BEFORE UPDATE ON public.qurra_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ events / timeline ============
CREATE TABLE public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  title_ar text NOT NULL,
  body_ar text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_app ON public.application_events(application_id, created_at DESC);
GRANT SELECT, INSERT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read" ON public.application_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE POLICY "events insert" ON public.application_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));

-- ============ seat holds ============
CREATE TABLE public.seat_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seat_holds_classroom ON public.seat_holds(classroom_id) WHERE released_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_holds TO authenticated;
GRANT ALL ON public.seat_holds TO service_role;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seat holds access" ON public.seat_holds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id
    AND (a.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));

-- ============ seed: stages ============
INSERT INTO public.stages (slug,name_ar,name_en,tagline_ar,age_label,min_age_months,max_age_months,philosophy_ar,learning_approach_ar,operating_hours,teacher_ratio,tuition_from,admission_fee,total_seats,taken_seats,tone,sort_order,daily_schedule,activities,outcomes,facilities,teachers,faqs)
VALUES
('small-kids','صغار المنال','Small Kids','بيئة حانية للخطوات الأولى','أقل من 3 سنوات',12,36,
 'نؤمن أن السنوات الأولى هي حجر الأساس، لذلك نوفّر بيئة آمنة ودافئة تُشبه المنزل، مع رعاية فردية تراعي إيقاع كل طفل.',
 'تعلّم حسّي حركي قائم على اللعب والاستكشاف الموجّه.',
 'الأحد - الخميس · 7:00 ص - 1:00 م','معلمة لكل 5 أطفال',9000,1000,40,18,'rose',1,
 '[{"time":"7:00","title":"استقبال وترحيب"},{"time":"8:00","title":"حلقة الصباح والأناشيد"},{"time":"9:00","title":"وجبة الإفطار"},{"time":"9:45","title":"لعب حسّي حركي"},{"time":"11:00","title":"قصة وأنشطة هادئة"},{"time":"12:00","title":"راحة وقيلولة"},{"time":"13:00","title":"انصراف"}]'::jsonb,
 '["اللعب الحسّي","الأناشيد والحركة","الرسم بالأصابع","التآزر البصري الحركي","العناية الذاتية"]'::jsonb,
 '["استقلالية أولى في الطعام والنظافة","نمو لغوي مبكر","ثقة وتواصل اجتماعي","مهارات حركية دقيقة"]'::jsonb,
 '["غرف نوم مخصصة","مطبخ صحي","ساحة لعب آمنة","كاميرات مراقبة","غرفة إسعاف"]'::jsonb,
 '[{"name":"أ. نورة العتيبي","title":"مشرفة المرحلة"},{"name":"أ. مها الحربي","title":"معلمة أولى"}]'::jsonb,
 '[{"q":"هل يمكن إحضار طعام خاص بالطفل؟","a":"نعم، مع تزويدنا بقائمة الحساسيات الغذائية."},{"q":"هل هناك فترة تهيئة؟","a":"نعم، أسبوع تهيئة تدريجي بحضور ولي الأمر عند الحاجة."}]'::jsonb),
('montessori','كبار المنال · مونتيسوري','Montessori','منهج مونتيسوري لبناء الاستقلالية','من 3 إلى 6 سنوات',36,72,
 'الطفل قادر على قيادة تعلّمه حين نهيّئ له بيئة معدّة بعناية، فنراقب ونوجّه بدل أن نملي ونلقّن.',
 'منهج مونتيسوري الأصيل مع تهيئة لغوية عربية وإنجليزية وقرآن وقيم.',
 'الأحد - الخميس · 7:00 ص - 12:30 م','معلمة لكل 8 أطفال',11000,1200,90,54,'mint',2,
 '[{"time":"7:00","title":"استقبال وحلقة الصباح"},{"time":"8:00","title":"دورة عمل مونتيسوري"},{"time":"10:00","title":"وجبة وفسحة"},{"time":"10:45","title":"القرآن والقيم"},{"time":"11:30","title":"لغة إنجليزية وأنشطة"},{"time":"12:30","title":"انصراف"}]'::jsonb,
 '["الحياة العملية","الحسّي","اللغة العربية","الرياضيات","الثقافة والعلوم","القرآن والأناشيد"]'::jsonb,
 '["تركيز طويل ومستقل","أساس قوي في القراءة والحساب","انضباط ذاتي","حب الاستطلاع العلمي"]'::jsonb,
 '["بيئات مونتيسوري معدّة","مكتبة أطفال","معمل علوم مصغّر","ساحة خارجية","قاعة أنشطة"]'::jsonb,
 '[{"name":"أ. هيفاء القحطاني","title":"موجّهة مونتيسوري معتمدة"},{"name":"أ. سارة الدوسري","title":"معلمة قرآن"}]'::jsonb,
 '[{"q":"ما الفرق بين مونتيسوري والروضة التقليدية؟","a":"الطفل يختار عمله ضمن بيئة معدّة، والمعلمة موجّهة لا ملقّنة."},{"q":"هل تُدرّس اللغة الإنجليزية؟","a":"نعم، تهيئة لغوية يومية بأسلوب تفاعلي."}]'::jsonb),
('primary','المرحلة الابتدائية','Primary','من الصف الأول إلى السادس','من 6 إلى 12 سنة',72,144,
 'نبني متعلمًا واثقًا يجمع بين التميّز الأكاديمي والهوية الإسلامية والمهارات الحديثة.',
 'مناهج وزارة التعليم مع برامج إثرائية وأندية أسبوعية وتقييم مستمر.',
 'الأحد - الخميس · 6:45 ص - 1:30 م','معلمة لكل 15 طالبة',13000,1500,150,96,'sky',3,
 '[{"time":"6:45","title":"الطابور الصباحي"},{"time":"7:15","title":"الحصص الدراسية"},{"time":"9:45","title":"الفسحة"},{"time":"10:15","title":"حصص إثرائية"},{"time":"12:30","title":"الأندية والأنشطة"},{"time":"13:30","title":"انصراف"}]'::jsonb,
 '["نادي القراءة","نادي الروبوت","نادي الخط العربي","الرياضة","المسرح المدرسي"]'::jsonb,
 '["إتقان المهارات الأساسية","مهارات تفكير ناقد","حفظ ومراجعة القرآن","مهارات رقمية"]'::jsonb,
 '["فصول ذكية","معمل حاسب","مصلى","صالة رياضية","مقصف صحي"]'::jsonb,
 '[{"name":"أ. منى الشمري","title":"وكيلة الشؤون التعليمية"},{"name":"أ. أروى المطيري","title":"معلمة لغتي"}]'::jsonb,
 '[{"q":"هل توجد حصص تقوية؟","a":"نعم، خطط دعم فردية بعد التقييم المستمر."},{"q":"كيف نتابع مستوى الطالبة؟","a":"تقارير دورية ولقاءات مع أولياء الأمور."}]'::jsonb);

-- ============ seed: classrooms ============
INSERT INTO public.classrooms (stage_id,slug,name_ar,color_hex,color_label,teacher_name,teacher_title,capacity,taken_seats,min_age_months,max_age_months,description_ar,learning_style_ar,schedule_ar,sort_order)
SELECT s.id, v.slug, v.name_ar, v.color_hex, v.color_label, v.teacher, v.title, v.capacity, v.taken, v.min_m, v.max_m, v.descr, v.style, v.sched, v.ord
FROM public.stages s
JOIN (VALUES
 ('small-kids','class-white','الفصل الأبيض','#F2F0EC','أبيض','أ. مها الحربي','معلمة أولى',16,7,12,24,'فصل هادئ للرضّع والدارجين مع ركن نوم ورعاية فردية.','رعاية وتحفيز حسّي','7:00 ص - 1:00 م',1),
 ('small-kids','class-purple','الفصل البنفسجي','#8E6BB8','بنفسجي','أ. لطيفة السالم','معلمة',18,11,24,36,'فصل الاستقلالية الأولى واللعب التمثيلي.','لعب موجّه','7:00 ص - 1:00 م',2),
 ('montessori','class-yellow','الفصل الأصفر','#E8B54A','أصفر','أ. هيفاء القحطاني','موجّهة مونتيسوري',22,14,36,48,'بيئة مونتيسوري للحياة العملية والحسّي.','مونتيسوري','7:00 ص - 12:30 م',3),
 ('montessori','class-green','الفصل الأخضر','#5EA37C','أخضر','أ. عبير الزهراني','موجّهة مونتيسوري',22,15,42,60,'تركيز على اللغة والرياضيات الحسّية.','مونتيسوري','7:00 ص - 12:30 م',4),
 ('montessori','class-red','الفصل الأحمر','#B64A6A','أحمر','أ. ريم الغامدي','موجّهة مونتيسوري',22,13,48,66,'الثقافة والعلوم مع تهيئة للقراءة.','مونتيسوري','7:00 ص - 12:30 م',5),
 ('montessori','class-blue','الفصل الأزرق','#4A7FB6','أزرق','أ. أمل العنزي','موجّهة مونتيسوري',24,12,54,72,'تهيئة متقدمة للصف الأول.','مونتيسوري','7:00 ص - 12:30 م',6),
 ('primary','grade-1','الصف الأول','#7A1F3D','عنابي','أ. أروى المطيري','معلمة صف',25,18,72,90,'أساس القراءة والكتابة والحساب.','تعلّم نشط','6:45 ص - 1:30 م',7),
 ('primary','grade-2','الصف الثاني','#9C3355','عنابي فاتح','أ. جواهر السبيعي','معلمة صف',25,16,84,102,'تعزيز الطلاقة القرائية والحساب الذهني.','تعلّم نشط','6:45 ص - 1:30 م',8),
 ('primary','grade-3','الصف الثالث','#C2607E','وردي','أ. نوف البقمي','معلمة صف',25,15,96,114,'مهارات البحث والمشاريع الصغيرة.','تعلّم بالمشاريع','6:45 ص - 1:30 م',9),
 ('primary','grade-4','الصف الرابع','#4A7FB6','أزرق','أ. شهد الرشيد','معلمة صف',25,17,108,126,'تفكير ناقد ومهارات رقمية.','تعلّم بالمشاريع','6:45 ص - 1:30 م',10),
 ('primary','grade-5','الصف الخامس','#5EA37C','أخضر','أ. دلال الحمد','معلمة صف',25,16,120,138,'استعداد للمرحلة المتوسطة.','تعلّم بالمشاريع','6:45 ص - 1:30 م',11),
 ('primary','grade-6','الصف السادس','#E8B54A','ذهبي','أ. بشرى الخالدي','معلمة صف',25,14,132,150,'قيادة طلابية ومشاريع تخرّج.','تعلّم بالمشاريع','6:45 ص - 1:30 م',12)
) AS v(stage_slug,slug,name_ar,color_hex,color_label,teacher,title,capacity,taken,min_m,max_m,descr,style,sched,ord)
ON v.stage_slug = s.slug;

-- ============ seed: services ============
INSERT INTO public.services (slug,name_ar,description_ar,category,price,price_note,is_required,sort_order) VALUES
('transport-two-way','النقل المدرسي (ذهاب وعودة)','حافلات مكيّفة مع مشرفة داخل الحي.','transportation',2400,'سنويًا',false,1),
('transport-one-way','النقل المدرسي (اتجاه واحد)','ذهاب فقط أو عودة فقط.','transportation',1400,'سنويًا',false,2),
('uniform-set','الزي المدرسي','طقمان صيفي وشتوي مع الشعار.','uniform',450,'للطقم',false,3),
('books-set','الكتب والحقيبة','كتب المنهج والأدوات والحقيبة.','books',600,'سنويًا',false,4),
('meals-daily','الوجبات الصحية','وجبة يومية متوازنة معتمدة من أخصائية تغذية.','meals',1800,'سنويًا',false,5),
('activities-clubs','الأندية والأنشطة','نادي أسبوعي يختاره الطالب.','activities',700,'سنويًا',false,6),
('after-school','الرعاية بعد الدوام','رعاية حتى الساعة 3:00 عصرًا.','other',1500,'سنويًا',false,7);

-- ============ seed: document types ============
INSERT INTO public.document_types (slug,name_ar,description_ar,is_required,applies_to_nationality,applies_to_stage_slug,requires_medical,requires_service_slug,sort_order) VALUES
('parent-id','هوية ولي الأمر','صورة واضحة من الهوية الوطنية.',true,'saudi',NULL,false,NULL,1),
('parent-iqama','إقامة ولي الأمر','صورة سارية من الإقامة.',true,'resident',NULL,false,NULL,2),
('child-birth-certificate','شهادة ميلاد الطفل','شهادة الميلاد أو سجل الأسرة.',true,'all',NULL,false,NULL,3),
('child-id','هوية / إقامة الطفل','صورة من هوية أو إقامة الطفل.',true,'all',NULL,false,NULL,4),
('vaccination-record','سجل التطعيمات','دفتر التطعيمات محدّث.',true,'all',NULL,false,NULL,5),
('student-photo','صورة شخصية للطالب','صورة حديثة بخلفية بيضاء.',true,'all',NULL,false,NULL,6),
('medical-report','التقرير الطبي','مطلوب عند وجود حالة صحية أو حساسية.',true,'all',NULL,true,NULL,7),
('residence-proof','إثبات السكن','عقد إيجار أو فاتورة خدمات.',false,'resident',NULL,false,NULL,8),
('previous-school-record','كشف الدرجات السابق','من المدرسة السابقة.',true,'all','primary',false,NULL,9),
('transport-form','نموذج النقل المدرسي','بيانات العنوان ونقطة التجمّع.',true,'all',NULL,false,'transport-two-way',10);

-- ============ permissions ============
INSERT INTO public.permissions (key, description_ar, category) VALUES
('admissions.view','عرض طلبات القبول','القبول'),
('admissions.review','مراجعة طلبات القبول وتغيير حالتها','القبول'),
('admissions.qurra','إدارة طلبات دعم قرة','القبول')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
SELECT r.role::public.app_role, p.key
FROM (VALUES ('registration_officer'),('supervisor'),('principal'),('admin')) AS r(role)
CROSS JOIN (VALUES ('admissions.view'),('admissions.review'),('admissions.qurra')) AS p(key)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key) VALUES ('accountant','admissions.view')
ON CONFLICT DO NOTHING;