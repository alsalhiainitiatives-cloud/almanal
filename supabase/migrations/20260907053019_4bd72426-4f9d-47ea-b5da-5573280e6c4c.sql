CREATE TABLE public.qurra_annual_dues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  total_due numeric NOT NULL DEFAULT 0,
  note text,
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (child_id, academic_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qurra_annual_dues TO authenticated;
GRANT ALL ON public.qurra_annual_dues TO service_role;

ALTER TABLE public.qurra_annual_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff manage qurra annual dues"
ON public.qurra_annual_dues FOR ALL TO authenticated
USING (public.is_school_staff(auth.uid()))
WITH CHECK (public.is_school_staff(auth.uid()));

CREATE INDEX idx_qurra_annual_dues_year ON public.qurra_annual_dues (academic_year);

CREATE TRIGGER update_qurra_annual_dues_updated_at
BEFORE UPDATE ON public.qurra_annual_dues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();