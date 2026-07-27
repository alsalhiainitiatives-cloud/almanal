DROP POLICY IF EXISTS "applications owner delete" ON public.applications;
CREATE POLICY "applications owner delete" ON public.applications FOR DELETE TO authenticated
  USING (parent_id = auth.uid() AND status IN ('draft','withdrawn','rejected'));