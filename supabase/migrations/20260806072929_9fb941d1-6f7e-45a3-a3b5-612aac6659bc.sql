CREATE TABLE public.reservation_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.seat_reservations(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  actor_kind text NOT NULL DEFAULT 'parent',
  action text NOT NULL,
  title_ar text NOT NULL,
  body_ar text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX reservation_events_reservation_idx ON public.reservation_events (reservation_id, created_at);

GRANT SELECT, INSERT ON public.reservation_events TO authenticated;
GRANT ALL ON public.reservation_events TO service_role;

ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reservation events follow the reservation"
ON public.reservation_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.seat_reservations r
  WHERE r.id = reservation_events.reservation_id
    AND (r.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
));

CREATE POLICY "Participants log reservation events"
ON public.reservation_events FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.seat_reservations r
  WHERE r.id = reservation_events.reservation_id
    AND (r.parent_id = auth.uid() OR public.is_school_staff(auth.uid()))
));

CREATE POLICY "Parents withdraw their pending reservations"
ON public.seat_reservations FOR UPDATE TO authenticated
USING (parent_id = auth.uid() AND status = 'pending_review')
WITH CHECK (parent_id = auth.uid() AND status IN ('pending_review', 'withdrawn'));

CREATE POLICY "Parents update children of pending reservations"
ON public.seat_reservation_children FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.seat_reservations r
  WHERE r.id = seat_reservation_children.reservation_id
    AND r.parent_id = auth.uid()
    AND r.status = 'pending_review'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.seat_reservations r
  WHERE r.id = seat_reservation_children.reservation_id
    AND r.parent_id = auth.uid()
    AND r.status = 'pending_review'
));