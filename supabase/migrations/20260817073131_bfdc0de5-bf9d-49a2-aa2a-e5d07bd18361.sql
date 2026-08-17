CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role::text = 'teacher'
  );
$$;

CREATE POLICY "journey evidence staff read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'journey-evidence'
    AND (public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid()))
  );

CREATE POLICY "journey evidence staff write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'journey-evidence'
    AND (public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid()))
  );

CREATE POLICY "journey evidence staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'journey-evidence'
    AND (public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid()))
  );