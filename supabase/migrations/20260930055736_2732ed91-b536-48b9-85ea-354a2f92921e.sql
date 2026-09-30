CREATE TABLE public.teacher_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

CREATE INDEX idx_teacher_subjects_teacher ON public.teacher_subjects (teacher_id);
CREATE INDEX idx_teacher_subjects_subject ON public.teacher_subjects (subject_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_subjects TO authenticated;
GRANT ALL ON public.teacher_subjects TO service_role;

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage teacher subjects"
  ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "teacher reads own subjects"
  ON public.teacher_subjects FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- Subject teachers are teachers of the classroom their subject belongs to,
-- without becoming the classroom's homeroom teacher.
CREATE OR REPLACE FUNCTION public.is_subject_teacher(_user_id uuid, _classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_subjects ts
    JOIN public.subjects s ON s.id = ts.subject_id
    WHERE ts.teacher_id = _user_id
      AND s.classroom_id = _classroom_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_subject_teacher(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_subject_teacher(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_read_classroom_curriculum(_user_id uuid, _classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _classroom_id IS NOT NULL AND (
    public.is_school_staff(_user_id)
    OR public.is_classroom_teacher(_user_id, _classroom_id)
    OR public.is_subject_teacher(_user_id, _classroom_id)
    OR public.parent_has_child_in_classroom(_user_id, _classroom_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_classroom_curriculum(_user_id uuid, _classroom_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _classroom_id IS NOT NULL AND (
    public.is_school_staff(_user_id)
    OR public.is_classroom_teacher(_user_id, _classroom_id)
    OR public.is_subject_teacher(_user_id, _classroom_id)
  );
$$;