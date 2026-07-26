CREATE POLICY "admission docs owner read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'admission-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_school_staff(auth.uid())
  )
);

CREATE POLICY "admission docs owner insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "admission docs owner update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'admission-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'admission-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "admission docs owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'admission-documents' AND (storage.foldername(name))[1] = auth.uid()::text);