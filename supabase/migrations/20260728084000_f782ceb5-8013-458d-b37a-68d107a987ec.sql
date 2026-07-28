CREATE POLICY "classroom media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'classroom-media');

CREATE POLICY "classroom media staff insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'classroom-media' AND public.is_school_staff(auth.uid()));

CREATE POLICY "classroom media staff update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'classroom-media' AND public.is_school_staff(auth.uid()))
WITH CHECK (bucket_id = 'classroom-media' AND public.is_school_staff(auth.uid()));

CREATE POLICY "classroom media staff delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'classroom-media' AND public.is_school_staff(auth.uid()));