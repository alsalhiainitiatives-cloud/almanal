CREATE TABLE public.lesson_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  performance_level integer NOT NULL DEFAULT 0,
  growth_level integer NOT NULL DEFAULT 0,
  performance_colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  growth_colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  note_ar text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, lesson_id)
);

CREATE INDEX lesson_assessments_classroom_idx ON public.lesson_assessments (classroom_id);
CREATE INDEX lesson_assessments_lesson_idx ON public.lesson_assessments (lesson_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_assessments TO authenticated;
GRANT ALL ON public.lesson_assessments TO service_role;

ALTER TABLE public.lesson_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessments readable by classroom members" ON public.lesson_assessments
  FOR SELECT TO authenticated
  USING (public.can_read_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "assessments insert by classroom staff" ON public.lesson_assessments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "assessments update by classroom staff" ON public.lesson_assessments
  FOR UPDATE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), classroom_id))
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "assessments delete by classroom staff" ON public.lesson_assessments
  FOR DELETE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

CREATE TRIGGER update_lesson_assessments_updated_at
  BEFORE UPDATE ON public.lesson_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assessment_classroom_id(_assessment_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT classroom_id FROM public.lesson_assessments WHERE id = _assessment_id;
$$;

CREATE TABLE public.assessment_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.lesson_assessments(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  file_name text,
  file_size integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_evidences_assessment_idx ON public.assessment_evidences (assessment_id);

GRANT SELECT, INSERT, DELETE ON public.assessment_evidences TO authenticated;
GRANT ALL ON public.assessment_evidences TO service_role;

ALTER TABLE public.assessment_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessment evidence readable by classroom members" ON public.assessment_evidences
  FOR SELECT TO authenticated
  USING (public.can_read_classroom_curriculum(auth.uid(), public.assessment_classroom_id(assessment_id)));

CREATE POLICY "assessment evidence insert by classroom staff" ON public.assessment_evidences
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), public.assessment_classroom_id(assessment_id)));

CREATE POLICY "assessment evidence delete by classroom staff" ON public.assessment_evidences
  FOR DELETE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), public.assessment_classroom_id(assessment_id)));