CREATE TABLE public.study_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'weekly',
  title_ar text,
  notes text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_plans_classroom ON public.study_plans(classroom_id, start_date DESC);

CREATE TABLE public.study_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  lesson_name_ar text,
  subject_name_ar text,
  color_hex text NOT NULL DEFAULT '#7A1F3D',
  scheduled_day smallint NOT NULL DEFAULT 0,
  scheduled_date date,
  scheduled_time text,
  duration_minutes integer,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_plan_items_plan ON public.study_plan_items(plan_id, scheduled_day, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_items TO authenticated;
GRANT ALL ON public.study_plan_items TO service_role;

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.study_plan_classroom_id(_plan_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.classroom_id FROM public.study_plans p WHERE p.id = _plan_id;
$$;

CREATE OR REPLACE FUNCTION public.study_plan_published(_plan_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.published FROM public.study_plans p WHERE p.id = _plan_id;
$$;

CREATE POLICY "Staff and teachers read classroom study plans"
ON public.study_plans FOR SELECT TO authenticated
USING (
  public.can_write_classroom_curriculum(auth.uid(), classroom_id)
  OR (published AND public.parent_has_child_in_classroom(auth.uid(), classroom_id))
);

CREATE POLICY "Staff and teachers insert study plans"
ON public.study_plans FOR INSERT TO authenticated
WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "Staff and teachers update study plans"
ON public.study_plans FOR UPDATE TO authenticated
USING (public.can_write_classroom_curriculum(auth.uid(), classroom_id))
WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "Staff and teachers delete study plans"
ON public.study_plans FOR DELETE TO authenticated
USING (public.can_write_classroom_curriculum(auth.uid(), classroom_id));

CREATE POLICY "Read study plan items"
ON public.study_plan_items FOR SELECT TO authenticated
USING (
  public.can_write_classroom_curriculum(auth.uid(), public.study_plan_classroom_id(plan_id))
  OR (
    public.study_plan_published(plan_id)
    AND public.parent_has_child_in_classroom(auth.uid(), public.study_plan_classroom_id(plan_id))
  )
);

CREATE POLICY "Write study plan items"
ON public.study_plan_items FOR ALL TO authenticated
USING (public.can_write_classroom_curriculum(auth.uid(), public.study_plan_classroom_id(plan_id)))
WITH CHECK (public.can_write_classroom_curriculum(auth.uid(), public.study_plan_classroom_id(plan_id)));

CREATE TRIGGER study_plans_updated BEFORE UPDATE ON public.study_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER study_plan_items_updated BEFORE UPDATE ON public.study_plan_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();