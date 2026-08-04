DROP POLICY "Staff can read contact messages" ON public.contact_messages;
CREATE POLICY "Staff can read contact messages" ON public.contact_messages
FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'inbox.view'));

DROP POLICY "Staff can update contact messages" ON public.contact_messages;
CREATE POLICY "Staff can update contact messages" ON public.contact_messages
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'inbox.status') OR public.has_permission(auth.uid(), 'inbox.note'))
WITH CHECK (public.has_permission(auth.uid(), 'inbox.status') OR public.has_permission(auth.uid(), 'inbox.note'));

DROP POLICY "Admins can delete contact messages" ON public.contact_messages;
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages
FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'inbox.delete'));

DROP POLICY "Staff can read all testimonials" ON public.site_testimonials;
CREATE POLICY "Staff can read all testimonials" ON public.site_testimonials
FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'inbox.view'));

DROP POLICY "Staff can moderate testimonials" ON public.site_testimonials;
CREATE POLICY "Staff can moderate testimonials" ON public.site_testimonials
FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'reviews.moderate'))
WITH CHECK (public.has_permission(auth.uid(), 'reviews.moderate'));

DROP POLICY "Staff can delete testimonials" ON public.site_testimonials;
CREATE POLICY "Staff can delete testimonials" ON public.site_testimonials
FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'reviews.moderate') AND public.has_permission(auth.uid(), 'inbox.delete'));