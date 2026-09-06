CREATE POLICY "Private chat members upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'private'
  AND public.can_access_private_chat(auth.uid(), ((storage.foldername(name))[2])::uuid)
);