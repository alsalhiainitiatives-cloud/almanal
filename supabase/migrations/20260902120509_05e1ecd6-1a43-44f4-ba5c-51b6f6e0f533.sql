-- 1) Bank accounts: staff-only read
DROP POLICY IF EXISTS "bank_accounts_read" ON public.bank_accounts;
CREATE POLICY "bank_accounts_read_staff" ON public.bank_accounts
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'principal')
  OR public.has_role(auth.uid(), 'accountant')
);

-- 2) Classroom media: no blanket public read
DROP POLICY IF EXISTS "classroom media public read" ON storage.objects;

CREATE POLICY "classroom media site read" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] IN ('site', 'covers', 'gallery')
);

CREATE POLICY "classroom media staff read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-media'
  AND (public.is_school_staff(auth.uid()) OR public.is_teacher(auth.uid()))
);

CREATE POLICY "classroom media parent child read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'classroom-media'
  AND (storage.foldername(name))[1] = 'students'
  AND public.is_child_parent(auth.uid(), NULLIF((storage.foldername(name))[2], '')::uuid)
);