DROP POLICY IF EXISTS "site_content_admin_write" ON public.site_content;
CREATE POLICY "site_content_admin_write" ON public.site_content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'principal') OR public.has_permission(auth.uid(), 'website.content_manage'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'principal') OR public.has_permission(auth.uid(), 'website.content_manage'));

CREATE POLICY "classroom media website managers insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'classroom-media' AND (storage.foldername(name))[1] IN ('site','covers','gallery') AND public.has_permission(auth.uid(), 'website.content_manage'));