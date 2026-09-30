ALTER TABLE public.study_plans
  ADD COLUMN child_id uuid REFERENCES public.application_children(id) ON DELETE CASCADE;

CREATE INDEX idx_study_plans_child ON public.study_plans(child_id, start_date DESC);

CREATE OR REPLACE FUNCTION public.study_plan_child_id(_plan_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.child_id FROM public.study_plans p WHERE p.id = _plan_id;
$$;

REVOKE ALL ON FUNCTION public.study_plan_child_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.study_plan_child_id(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.study_plan_child_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.study_plan_child_id(uuid) TO service_role;

DROP POLICY IF EXISTS "Staff and teachers read classroom study plans" ON public.study_plans;
CREATE POLICY "Staff and teachers read classroom study plans"
ON public.study_plans FOR SELECT TO authenticated
USING (
  public.can_write_classroom_curriculum(auth.uid(), classroom_id)
  OR (
    published
    AND (
      CASE
        WHEN child_id IS NULL THEN public.parent_has_child_in_classroom(auth.uid(), classroom_id)
        ELSE public.is_child_parent(auth.uid(), child_id)
      END
    )
  )
);

DROP POLICY IF EXISTS "Read study plan items" ON public.study_plan_items;
CREATE POLICY "Read study plan items"
ON public.study_plan_items FOR SELECT TO authenticated
USING (
  public.can_write_classroom_curriculum(auth.uid(), public.study_plan_classroom_id(plan_id))
  OR (
    public.study_plan_published(plan_id)
    AND (
      CASE
        WHEN public.study_plan_child_id(plan_id) IS NULL
          THEN public.parent_has_child_in_classroom(auth.uid(), public.study_plan_classroom_id(plan_id))
        ELSE public.is_child_parent(auth.uid(), public.study_plan_child_id(plan_id))
      END
    )
  )
);