-- Curriculum: subjects -> topics -> lessons, anchored to existing public.classrooms

CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  color_hex text NOT NULL DEFAULT '#7A1F3D',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subjects_classroom ON public.subjects(classroom_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_topics_subject ON public.topics(subject_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  description_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_topic ON public.lessons(topic_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Helper resolvers (security definer to avoid recursive RLS evaluation)
CREATE OR REPLACE FUNCTION public.subject_classroom_id(_subject_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.classroom_id FROM public.subjects s WHERE s.id = _subject_id;
$$;

CREATE OR REPLACE FUNCTION public.topic_classroom_id(_topic_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.classroom_id
  FROM public.topics t JOIN public.subjects s ON s.id = t.subject_id
  WHERE t.id = _topic_id;
$$;

CREATE OR REPLACE FUNCTION public.can_read_classroom_curriculum(_user_id uuid, _classroom_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _classroom_id IS NOT NULL AND (
    public.is_school_staff(_user_id)
    OR public.is_classroom_teacher(_user_id, _classroom_id)
    OR public.parent_has_child_in_classroom(_user_id, _classroom_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_classroom_curriculum(_user_id uuid, _classroom_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _classroom_id IS NOT NULL AND (
    public.is_school_staff(_user_id)
    OR public.is_classroom_teacher(_user_id, _classroom_id)
  );
$$;

-- Policies: subjects
CREATE POLICY "curriculum_subjects_read" ON public.subjects FOR SELECT TO authenticated
  USING (public.can_read_classroom_curriculum(auth.uid(), classroom_id));
CREATE POLICY "curriculum_subjects_insert" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), classroom_id));
CREATE POLICY "curriculum_subjects_update" ON public.subjects FOR UPDATE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), classroom_id))
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), classroom_id));
CREATE POLICY "curriculum_subjects_delete" ON public.subjects FOR DELETE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

-- Policies: topics
CREATE POLICY "curriculum_topics_read" ON public.topics FOR SELECT TO authenticated
  USING (public.can_read_classroom_curriculum(auth.uid(), public.subject_classroom_id(subject_id)));
CREATE POLICY "curriculum_topics_insert" ON public.topics FOR INSERT TO authenticated
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), public.subject_classroom_id(subject_id)));
CREATE POLICY "curriculum_topics_update" ON public.topics FOR UPDATE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), public.subject_classroom_id(subject_id)))
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), public.subject_classroom_id(subject_id)));
CREATE POLICY "curriculum_topics_delete" ON public.topics FOR DELETE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), public.subject_classroom_id(subject_id)));

-- Policies: lessons
CREATE POLICY "curriculum_lessons_read" ON public.lessons FOR SELECT TO authenticated
  USING (public.can_read_classroom_curriculum(auth.uid(), public.topic_classroom_id(topic_id)));
CREATE POLICY "curriculum_lessons_insert" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), public.topic_classroom_id(topic_id)));
CREATE POLICY "curriculum_lessons_update" ON public.lessons FOR UPDATE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), public.topic_classroom_id(topic_id)))
  WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), public.topic_classroom_id(topic_id)));
CREATE POLICY "curriculum_lessons_delete" ON public.lessons FOR DELETE TO authenticated
  USING (public.can_write_classroom_curriculum(auth.uid(), public.topic_classroom_id(topic_id)));

-- updated_at triggers
CREATE TRIGGER subjects_updated BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER topics_updated BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();