CREATE TABLE public.qurra_monthly_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  due_amount numeric(12,2) NOT NULL DEFAULT 0,
  transferred_amount numeric(12,2) NOT NULL DEFAULT 0,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamp with time zone,
  note text,
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (child_id, academic_year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qurra_monthly_payments TO authenticated;
GRANT ALL ON public.qurra_monthly_payments TO service_role;

ALTER TABLE public.qurra_monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read qurra monthly payments"
ON public.qurra_monthly_payments FOR SELECT TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff can write qurra monthly payments"
ON public.qurra_monthly_payments FOR ALL TO authenticated
USING (public.is_school_staff(auth.uid()))
WITH CHECK (public.is_school_staff(auth.uid()));

CREATE INDEX qurra_monthly_payments_child_year_idx
ON public.qurra_monthly_payments (academic_year, child_id);

CREATE TRIGGER update_qurra_monthly_payments_updated_at
BEFORE UPDATE ON public.qurra_monthly_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();