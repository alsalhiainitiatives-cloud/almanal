
-- ========== SETTINGS ==========
CREATE TABLE public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES public.stages(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  academic_year text NOT NULL DEFAULT '1447',
  label_ar text,
  amount numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'year' CHECK (unit IN ('month','term','two_terms','year')),
  terms_per_year integer NOT NULL DEFAULT 2 CHECK (terms_per_year BETWEEN 1 AND 4),
  months_per_year integer NOT NULL DEFAULT 9 CHECK (months_per_year BETWEEN 1 AND 12),
  admission_fee numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fee_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plans TO authenticated;
GRANT ALL ON public.fee_plans TO service_role;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_plans_read" ON public.fee_plans FOR SELECT USING (true);
CREATE POLICY "fee_plans_write" ON public.fee_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER fee_plans_updated BEFORE UPDATE ON public.fee_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_plan_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL DEFAULT '1447' UNIQUE,
  allow_full boolean NOT NULL DEFAULT true,
  full_discount_percent numeric NOT NULL DEFAULT 0,
  allowed_installments integer[] NOT NULL DEFAULT '{1,2,3,4,6,9,12}',
  max_installments integer NOT NULL DEFAULT 12 CHECK (max_installments BETWEEN 1 AND 12),
  down_payment_percent numeric NOT NULL DEFAULT 25,
  due_day integer NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 28),
  first_due_offset_days integer NOT NULL DEFAULT 7,
  late_after_days integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_plan_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plan_settings TO authenticated;
GRANT ALL ON public.payment_plan_settings TO service_role;
ALTER TABLE public.payment_plan_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pps_read" ON public.payment_plan_settings FOR SELECT USING (true);
CREATE POLICY "pps_write" ON public.payment_plan_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER pps_updated BEFORE UPDATE ON public.payment_plan_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  description_ar text,
  kind text NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','amount')),
  value numeric NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'manual' CHECK (condition IN ('sibling','staff','orphan','early_payment','manual')),
  min_children integer NOT NULL DEFAULT 1,
  max_amount numeric,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discount_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_rules TO authenticated;
GRANT ALL ON public.discount_rules TO service_role;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discount_rules_read" ON public.discount_rules FOR SELECT USING (true);
CREATE POLICY "discount_rules_write" ON public.discount_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER discount_rules_updated BEFORE UPDATE ON public.discount_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name_ar text NOT NULL DEFAULT 'جمعية الصالحية الأهلية',
  school_name_ar text NOT NULL DEFAULT 'روضة ومدارس المنال',
  logo_url text,
  account_holder text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_number text,
  iban text,
  notes_ar text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_accounts_read" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts_write" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER bank_accounts_updated BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qurra_message_ar text NOT NULL DEFAULT 'يتم سداد المستحقات المالية الدراسية فقط من خلال قرة',
  qurra_services_message_ar text NOT NULL DEFAULT 'الرسوم الدراسية مغطاة عبر دعم قرة، والمبالغ الظاهرة أدناه تخص الخدمات الإضافية التي اخترتها ويتم سدادها مباشرة للروضة.',
  whatsapp_template text NOT NULL DEFAULT 'السلام عليكم {parent}، نذكّركم بوجود دفعة مستحقة رقم {seq} بمبلغ {amount} ريال عن الطالب/ة {child}، تاريخ الاستحقاق {due}. نرجو السداد وإرفاق الإيصال عبر بوابة أولياء الأمور. {school}',
  reminder_days_before integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.finance_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated;
GRANT ALL ON public.finance_settings TO service_role;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_settings_read" ON public.finance_settings FOR SELECT USING (true);
CREATE POLICY "finance_settings_write" ON public.finance_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER finance_settings_updated BEFORE UPDATE ON public.finance_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== LEDGER ==========
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  academic_year text NOT NULL DEFAULT '1447',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paid','cancelled')),
  plan_type text NOT NULL DEFAULT 'full' CHECK (plan_type IN ('full','installments')),
  installments_count integer NOT NULL DEFAULT 1 CHECK (installments_count BETWEEN 1 AND 12),
  admission_fee numeric NOT NULL DEFAULT 0,
  tuition_total numeric NOT NULL DEFAULT 0,
  services_total numeric NOT NULL DEFAULT 0,
  discount_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  paid_total numeric NOT NULL DEFAULT 0,
  qurra_covered boolean NOT NULL DEFAULT false,
  qurra_note text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invoices_application_year_key ON public.invoices(application_id, academic_year);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_read" ON public.invoices FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR public.is_school_staff(auth.uid()));
CREATE POLICY "invoices_write" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'registration_officer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'registration_officer'));
CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('admission','tuition','service','discount','adjustment')),
  label_ar text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  qurra_covered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_read" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (i.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE POLICY "invoice_items_write" ON public.invoice_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'registration_officer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'registration_officer'));

CREATE TABLE public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due','pending_review','paid','waived','cancelled')),
  paid_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, seq)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installments_read" ON public.installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (i.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE POLICY "installments_write" ON public.installments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'registration_officer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'registration_officer'));
CREATE TRIGGER installments_updated BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.installments(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text,
  amount numeric NOT NULL DEFAULT 0,
  transfer_date date,
  reference_no text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_read" ON public.payment_receipts FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_school_staff(auth.uid()));
CREATE POLICY "receipts_insert_own" ON public.payment_receipts FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (i.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))));
CREATE POLICY "receipts_staff_update" ON public.payment_receipts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'accountant'));
CREATE POLICY "receipts_staff_delete" ON public.payment_receipts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));
CREATE TRIGGER receipts_updated BEFORE UPDATE ON public.payment_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- storage policies for the receipts bucket (bucket created via tooling)
CREATE POLICY "receipts_bucket_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND (owner = auth.uid() OR public.is_school_staff(auth.uid())));
CREATE POLICY "receipts_bucket_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND owner = auth.uid());

-- ========== SEED ==========
INSERT INTO public.payment_plan_settings (academic_year) VALUES ('1447');
INSERT INTO public.finance_settings DEFAULT VALUES;
INSERT INTO public.bank_accounts (account_holder, bank_name, iban, is_default, notes_ar)
VALUES ('جمعية الصالحية الأهلية', 'مصرف الراجحي', 'SA0000000000000000000000', true, 'يرجى كتابة اسم الطالب ورقم الطلب في خانة ملاحظات التحويل.');
INSERT INTO public.discount_rules (name_ar, description_ar, kind, value, condition, min_children, sort_order)
VALUES
  ('خصم الإخوة', 'يُطبق عند تسجيل أكثر من طفل في نفس الطلب', 'percent', 10, 'sibling', 2, 1),
  ('خصم السداد الكامل', 'يُطبق عند اختيار السداد دفعة واحدة', 'percent', 5, 'early_payment', 1, 2),
  ('خصم أبناء منسوبي الروضة', NULL, 'percent', 15, 'staff', 1, 3),
  ('خصم الأيتام', NULL, 'percent', 25, 'orphan', 1, 4);
INSERT INTO public.fee_plans (stage_id, academic_year, label_ar, amount, unit, terms_per_year, months_per_year, admission_fee)
SELECT s.id, '1447', s.name_ar, COALESCE(NULLIF(s.tuition_from,0), 0), 'year', 2, 9, COALESCE(s.admission_fee,0)
FROM public.stages s;
