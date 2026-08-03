DROP POLICY IF EXISTS receipts_bucket_insert ON storage.objects;
DROP POLICY IF EXISTS receipts_bucket_read ON storage.objects;
DROP POLICY IF EXISTS receipts_bucket_update ON storage.objects;
DROP POLICY IF EXISTS receipts_bucket_delete ON storage.objects;

CREATE POLICY receipts_bucket_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY receipts_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_school_staff(auth.uid()))
  );

CREATE POLICY receipts_bucket_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY receipts_bucket_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );