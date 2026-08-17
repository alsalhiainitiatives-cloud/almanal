-- 1) new role value (referenced only via text comparison in this migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- 2) teacher ↔ classroom assignment
CREATE TABLE public.teacher_classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, classroom_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_classrooms TO authenticated;
GRANT ALL ON public.teacher_classrooms TO service_role;
ALTER TABLE public.teacher_classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage teacher classrooms" ON public.teacher_classrooms
  FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "teacher reads own classrooms" ON public.teacher_classrooms
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- 3) helper security-definer functions
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(_user_id uuid, _classroom_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classrooms tc
    WHERE tc.teacher_id = _user_id AND tc.classroom_id = _classroom_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_child_parent(_user_id uuid, _child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.application_children c
    JOIN public.applications a ON a.id = c.application_id
    WHERE c.id = _child_id AND a.parent_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.parent_has_child_in_classroom(_user_id uuid, _classroom_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.application_children c
    JOIN public.applications a ON a.id = c.application_id
    WHERE a.parent_id = _user_id AND c.classroom_id = _classroom_id
  );
$$;

CREATE OR REPLACE FUNCTION public.child_classroom_id(_child_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.classroom_id FROM public.application_children c WHERE c.id = _child_id;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_child(_user_id uuid, _child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_classroom_teacher(_user_id, public.child_classroom_id(_child_id));
$$;

-- 4) weekly plans
CREATE TABLE public.weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  title_ar text NOT NULL,
  subject_ar text,
  lessons_ar text,
  activities_ar text,
  notes_ar text,
  status text NOT NULL DEFAULT 'published',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX weekly_plans_classroom_week_idx ON public.weekly_plans (classroom_id, week_start_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plans TO authenticated;
GRANT ALL ON public.weekly_plans TO service_role;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage weekly plans" ON public.weekly_plans
  FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "teacher manages own classroom plans" ON public.weekly_plans
  FOR ALL TO authenticated
  USING (public.is_classroom_teacher(auth.uid(), classroom_id))
  WITH CHECK (public.is_classroom_teacher(auth.uid(), classroom_id));

CREATE POLICY "parent reads classroom plans" ON public.weekly_plans
  FOR SELECT TO authenticated
  USING (status = 'published' AND public.parent_has_child_in_classroom(auth.uid(), classroom_id));

CREATE TRIGGER weekly_plans_updated BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) student skills tracking
CREATE TABLE public.student_skills_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  skill_name text NOT NULL,
  domain_ar text,
  completion_percentage integer NOT NULL DEFAULT 0,
  improvement_percentage integer NOT NULL DEFAULT 0,
  note_ar text,
  observed_at date NOT NULL DEFAULT current_date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_skills_child_idx ON public.student_skills_tracking (child_id, observed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_skills_tracking TO authenticated;
GRANT ALL ON public.student_skills_tracking TO service_role;
ALTER TABLE public.student_skills_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage skills" ON public.student_skills_tracking
  FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "teacher manages own children skills" ON public.student_skills_tracking
  FOR ALL TO authenticated
  USING (public.is_teacher_of_child(auth.uid(), child_id))
  WITH CHECK (public.is_teacher_of_child(auth.uid(), child_id));

CREATE POLICY "parent reads own child skills" ON public.student_skills_tracking
  FOR SELECT TO authenticated
  USING (public.is_child_parent(auth.uid(), child_id));

CREATE TRIGGER student_skills_updated BEFORE UPDATE ON public.student_skills_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) digital evidence attached to a skill observation
CREATE TABLE public.skill_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid NOT NULL REFERENCES public.student_skills_tracking(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_name text,
  file_size integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX skill_evidences_tracking_idx ON public.skill_evidences (tracking_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_evidences TO authenticated;
GRANT ALL ON public.skill_evidences TO service_role;
ALTER TABLE public.skill_evidences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_tracking(_user_id uuid, _tracking_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_skills_tracking t
    WHERE t.id = _tracking_id
      AND (
        public.is_school_staff(_user_id)
        OR public.is_teacher_of_child(_user_id, t.child_id)
        OR public.is_child_parent(_user_id, t.child_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_tracking(_user_id uuid, _tracking_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_skills_tracking t
    WHERE t.id = _tracking_id
      AND (public.is_school_staff(_user_id) OR public.is_teacher_of_child(_user_id, t.child_id))
  );
$$;

CREATE POLICY "read evidence" ON public.skill_evidences
  FOR SELECT TO authenticated
  USING (public.can_read_tracking(auth.uid(), tracking_id));

CREATE POLICY "write evidence" ON public.skill_evidences
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_tracking(auth.uid(), tracking_id));

CREATE POLICY "delete evidence" ON public.skill_evidences
  FOR DELETE TO authenticated
  USING (public.can_write_tracking(auth.uid(), tracking_id));