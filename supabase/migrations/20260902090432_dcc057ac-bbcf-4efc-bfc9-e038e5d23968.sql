CREATE POLICY "staff can delete applications" ON public.applications
FOR DELETE TO authenticated
USING (public.is_school_staff(auth.uid()));