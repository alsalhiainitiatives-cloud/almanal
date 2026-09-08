ALTER TABLE public.application_children ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_application_children_withdrawn_at ON public.application_children(withdrawn_at);

CREATE TABLE IF NOT EXISTS public.student_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.application_children(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  academic_year text,
  stage_id uuid REFERENCES public.stages(id),
  classroom_id uuid REFERENCES public.classrooms(id),
  kind text NOT NULL DEFAULT 'withdrawal',
  reason text NOT NULL DEFAULT 'other',
  reason_note text,
  destination_school text,
  requested_at date NOT NULL DEFAULT current_date,
  effective_date date,
  status text NOT NULL DEFAULT 'pending',
  finance_outstanding numeric NOT NULL DEFAULT 0,
  finance_cleared boolean NOT NULL DEFAULT false,
  finance_note text,
  certificate_number text,
  certificate_issued_at timestamptz,
  enrolled_from date,
  requested_by uuid,
  confirmed_by uuid,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_withdrawals TO authenticated;
GRANT ALL ON public.student_withdrawals TO service_role;
ALTER TABLE public.student_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage student withdrawals"
ON public.student_withdrawals FOR ALL TO authenticated
USING (public.is_school_staff(auth.uid()))
WITH CHECK (public.is_school_staff(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_withdrawals_active
  ON public.student_withdrawals(child_id) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_student_withdrawals_status ON public.student_withdrawals(status);

CREATE TRIGGER update_student_withdrawals_updated_at
BEFORE UPDATE ON public.student_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.classroom_enrolled_children(_classroom_id uuid)
 RETURNS TABLE(id uuid, name_ar text, gender text, student_number text, parent_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.name_ar,
    c.gender,
    a.student_number,
    a.parent_id
  FROM public.application_children c
  JOIN public.applications a ON a.id = c.application_id
  WHERE c.classroom_id = _classroom_id
    AND c.withdrawn_at IS NULL
    AND a.status = 'approved'
    AND (
      public.is_school_staff(auth.uid())
      OR public.is_classroom_teacher(auth.uid(), _classroom_id)
    )
  ORDER BY c.name_ar;
$function$;

CREATE OR REPLACE FUNCTION public.recount_classroom_seats()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with counts as (
    select c.id,
      (
        (select count(*) from public.application_children ac
           join public.applications a on a.id = ac.application_id
          where ac.classroom_id = c.id
            and ac.withdrawn_at is null
            and a.archived_at is null
            and a.status in ('submitted','under_review','needs_action','principal_review','waitlisted','approved'))
        +
        (select count(*) from public.seat_reservation_children src
           join public.seat_reservations r on r.id = src.reservation_id
          where src.assigned_classroom_id = c.id
            and src.waitlisted = false
            and r.status = 'approved'
            and r.application_id is null)
      )::int as n
    from public.classrooms c
  )
  update public.classrooms c
     set taken_seats = counts.n
    from counts
   where counts.id = c.id
     and c.taken_seats is distinct from counts.n;
$function$;

INSERT INTO public.permissions (key, category, module_name, sub_module_name, action, description_ar, sort_order)
VALUES
  ('students.withdraw', 'students', 'students', 'withdrawals', 'create', 'تسجيل طلب انسحاب طالب', 70),
  ('students.withdraw_confirm', 'students', 'students', 'withdrawals', 'approve', 'اعتماد الانسحاب وإصدار شهادة المدة', 80)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
SELECT r.role, p.key
FROM (VALUES ('admin'::app_role), ('supervisor'::app_role), ('principal'::app_role)) AS r(role),
     (VALUES ('students.withdraw'), ('students.withdraw_confirm')) AS p(key)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
VALUES ('registration_officer'::app_role, 'students.withdraw')
ON CONFLICT DO NOTHING;

SELECT public.recount_classroom_seats();
SELECT public.recount_stage_seats();