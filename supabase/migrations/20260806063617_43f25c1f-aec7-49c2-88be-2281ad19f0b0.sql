CREATE POLICY "Parents link approved reservation to their application"
  ON public.seat_reservations FOR UPDATE TO authenticated
  USING (parent_id = auth.uid() AND status = 'approved' AND application_id IS NULL)
  WITH CHECK (parent_id = auth.uid() AND status = 'approved');