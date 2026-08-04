CREATE TABLE public.promotion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stage_id uuid REFERENCES public.stages(id) ON DELETE CASCADE,
  to_stage_id uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  min_age_months integer NOT NULL DEFAULT 42,
  notice_months integer NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_rules TO authenticated;
GRANT ALL ON public.promotion_rules TO service_role;
ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view promotion rules"
ON public.promotion_rules FOR SELECT TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Managers can write promotion rules"
ON public.promotion_rules FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'registration_officer')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'registration_officer')
);

CREATE TRIGGER promotion_rules_updated
BEFORE UPDATE ON public.promotion_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL,
  to_stage_id uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'done',
  age_months integer,
  note text,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_promotions_child_idx ON public.student_promotions(child_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_promotions TO authenticated;
GRANT ALL ON public.student_promotions TO service_role;
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view student promotions"
ON public.student_promotions FOR SELECT TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Managers can log student promotions"
ON public.student_promotions FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'registration_officer')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'registration_officer')
);

CREATE OR REPLACE FUNCTION public.validate_student_promotion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('done', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_promotion_status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_promotions_validate
BEFORE INSERT OR UPDATE ON public.student_promotions
FOR EACH ROW EXECUTE FUNCTION public.validate_student_promotion();

INSERT INTO public.promotion_rules (from_stage_id, to_stage_id, min_age_months, notice_months, sort_order)
SELECT prev.id, nxt.id, nxt.min_age_months, 2, nxt.sort_order
FROM (
  SELECT id, sort_order, min_age_months,
         LAG(id) OVER (ORDER BY sort_order) AS prev_id
  FROM public.stages
  WHERE is_active = true
) nxt
JOIN public.stages prev ON prev.id = nxt.prev_id;