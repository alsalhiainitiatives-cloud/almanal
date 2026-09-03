CREATE POLICY "avatars read authenticated" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'classroom-media' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "avatars owner insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "avatars owner update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "avatars owner delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);