CREATE TABLE public.seat_reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL DEFAULT auth.uid(),
  academic_year text NOT NULL DEFAULT '2026-2027 / 1448هـ',
  parent_name text NOT NULL,
  parent_national_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  decision_note text,
  decided_by uuid,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.seat_reservation_children (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.seat_reservations(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  national_id text,
  gender text,
  birth_date date,
  stage_id uuid REFERENCES public.stages(id),
  preference_1_classroom_id uuid REFERENCES public.classrooms(id),
  preference_2_classroom_id uuid REFERENCES public.classrooms(id),
  preference_3_classroom_id uuid REFERENCES public.classrooms(id),
  assigned_classroom_id uuid REFERENCES public.classrooms(id),
  waitlisted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX seat_reservations_parent_idx ON public.seat_reservations (parent_id);
CREATE INDEX seat_reservations_status_idx ON public.seat_reservations (status);
CREATE INDEX seat_reservation_children_res_idx ON public.seat_reservation_children (reservation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_reservations TO authenticated;
GRANT ALL ON public.seat_reservations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_reservation_children TO authenticated;
GRANT ALL ON public.seat_reservation_children TO service_role;

ALTER TABLE public.seat_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_reservation_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents create their own reservations"
  ON public.seat_reservations FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents read their own reservations"
  ON public.seat_reservations FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR public.is_school_staff(auth.uid()));

CREATE POLICY "Staff decide reservations"
  ON public.seat_reservations FOR UPDATE TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "Parents cancel pending reservations"
  ON public.seat_reservations FOR DELETE TO authenticated
  USING (parent_id = auth.uid() AND status = 'pending_review');

CREATE POLICY "Reservation children follow the reservation"
  ON public.seat_reservation_children FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seat_reservations r
    WHERE r.id = reservation_id
      AND (r.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
  ));

CREATE POLICY "Parents add children to their reservation"
  ON public.seat_reservation_children FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seat_reservations r
    WHERE r.id = reservation_id AND r.parent_id = auth.uid()
  ));

CREATE POLICY "Staff update reservation children"
  ON public.seat_reservation_children FOR UPDATE TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "Parents delete children of pending reservations"
  ON public.seat_reservation_children FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.seat_reservations r
    WHERE r.id = reservation_id AND r.parent_id = auth.uid() AND r.status = 'pending_review'
  ));

CREATE TRIGGER seat_reservations_updated
  BEFORE UPDATE ON public.seat_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();