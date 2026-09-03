-- ============ SURVEYS ============
CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  is_mandatory boolean NOT NULL DEFAULT false,
  allow_snooze boolean NOT NULL DEFAULT true,
  snooze_duration_hours integer NOT NULL DEFAULT 24,
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surveys_status_chk CHECK (status IN ('draft','active','closed')),
  CONSTRAINT surveys_snooze_chk CHECK (snooze_duration_hours BETWEEN 1 AND 720)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  order_index integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_questions_type_chk CHECK (question_type IN ('text','single_choice','multiple_choice','rating_stars','likert_scale'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT ALL ON public.survey_questions TO service_role;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_options TO authenticated;
GRANT ALL ON public.survey_options TO service_role;
ALTER TABLE public.survey_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, parent_id)
);
GRANT SELECT, INSERT ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_numeric numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.survey_answers TO authenticated;
GRANT ALL ON public.survey_answers TO service_role;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_survey_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  snoozed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, survey_id),
  CONSTRAINT parent_survey_status_chk CHECK (status IN ('pending','snoozed','completed'))
);
GRANT SELECT, INSERT, UPDATE ON public.parent_survey_status TO authenticated;
GRANT ALL ON public.parent_survey_status TO service_role;
ALTER TABLE public.parent_survey_status ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id, order_index);
CREATE INDEX idx_survey_options_question ON public.survey_options(question_id, order_index);
CREATE INDEX idx_survey_answers_response ON public.survey_answers(response_id);
CREATE INDEX idx_survey_answers_question ON public.survey_answers(question_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_parent_survey_status_parent ON public.parent_survey_status(parent_id);

CREATE TRIGGER trg_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_survey_questions_updated_at BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_parent_survey_status_updated_at BEFORE UPDATE ON public.parent_survey_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PERMISSIONS ============
INSERT INTO public.permissions (key, description_ar, category, module_name, sub_module_name, action, sort_order) VALUES
  ('surveys.view',      'عرض الاستبانات',            'settings', 'website', 'surveys', 'read',    10),
  ('surveys.create',    'إنشاء استبانة جديدة',        'settings', 'website', 'surveys', 'create',  20),
  ('surveys.update',    'تعديل الاستبانات',           'settings', 'website', 'surveys', 'update',  30),
  ('surveys.delete',    'حذف الاستبانات',             'settings', 'website', 'surveys', 'delete',  40),
  ('surveys.publish',   'نشر الاستبانة أو إغلاقها',    'settings', 'website', 'surveys', 'publish', 50),
  ('surveys.analytics', 'عرض تحليلات الاستبانات',      'settings', 'website', 'surveys', 'read',    60),
  ('surveys.export',    'تصدير تقارير الاستبانات',     'settings', 'website', 'surveys', 'export',  70)
ON CONFLICT (key) DO UPDATE SET
  description_ar = EXCLUDED.description_ar,
  module_name = EXCLUDED.module_name,
  sub_module_name = EXCLUDED.sub_module_name,
  action = EXCLUDED.action,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role, permission_key)
SELECT r.role, p.key
FROM (VALUES ('admin'::app_role), ('supervisor'::app_role), ('principal'::app_role)) AS r(role)
CROSS JOIN (VALUES ('surveys.view'),('surveys.create'),('surveys.update'),('surveys.delete'),('surveys.publish'),('surveys.analytics'),('surveys.export')) AS p(key)
ON CONFLICT DO NOTHING;

-- ============ POLICIES ============
-- Surveys: staff manage; parents read active surveys only.
CREATE POLICY "Staff read surveys" ON public.surveys FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.view'));
CREATE POLICY "Parents read active surveys" ON public.surveys FOR SELECT TO authenticated
  USING (status = 'active');
CREATE POLICY "Staff create surveys" ON public.surveys FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'surveys.create'));
CREATE POLICY "Staff update surveys" ON public.surveys FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.update') OR public.has_permission(auth.uid(), 'surveys.publish'))
  WITH CHECK (public.has_permission(auth.uid(), 'surveys.update') OR public.has_permission(auth.uid(), 'surveys.publish'));
CREATE POLICY "Staff delete surveys" ON public.surveys FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.delete'));

-- Questions
CREATE POLICY "Read survey questions" ON public.survey_questions FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'surveys.view')
    OR EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.status = 'active')
  );
CREATE POLICY "Staff write survey questions" ON public.survey_questions FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.update') OR public.has_permission(auth.uid(), 'surveys.create'))
  WITH CHECK (public.has_permission(auth.uid(), 'surveys.update') OR public.has_permission(auth.uid(), 'surveys.create'));

-- Options
CREATE POLICY "Read survey options" ON public.survey_options FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'surveys.view')
    OR EXISTS (
      SELECT 1 FROM public.survey_questions q
      JOIN public.surveys s ON s.id = q.survey_id
      WHERE q.id = question_id AND s.status = 'active'
    )
  );
CREATE POLICY "Staff write survey options" ON public.survey_options FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.update') OR public.has_permission(auth.uid(), 'surveys.create'))
  WITH CHECK (public.has_permission(auth.uid(), 'surveys.update') OR public.has_permission(auth.uid(), 'surveys.create'));

-- Responses
CREATE POLICY "Parents read own responses" ON public.survey_responses FOR SELECT TO authenticated
  USING (parent_id = auth.uid());
CREATE POLICY "Staff read responses" ON public.survey_responses FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.analytics') OR public.has_permission(auth.uid(), 'surveys.view'));
CREATE POLICY "Parents insert own responses" ON public.survey_responses FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.surveys s WHERE s.id = survey_id AND s.status = 'active'));

-- Answers
CREATE POLICY "Parents read own answers" ON public.survey_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_responses r WHERE r.id = response_id AND r.parent_id = auth.uid()));
CREATE POLICY "Staff read answers" ON public.survey_answers FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'surveys.analytics') OR public.has_permission(auth.uid(), 'surveys.view'));
CREATE POLICY "Parents insert own answers" ON public.survey_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.survey_responses r WHERE r.id = response_id AND r.parent_id = auth.uid()));

-- Parent survey status
CREATE POLICY "Parents manage own survey status" ON public.parent_survey_status FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR public.has_permission(auth.uid(), 'surveys.analytics'));
CREATE POLICY "Parents insert own survey status" ON public.parent_survey_status FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Parents update own survey status" ON public.parent_survey_status FOR UPDATE TO authenticated
  USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());