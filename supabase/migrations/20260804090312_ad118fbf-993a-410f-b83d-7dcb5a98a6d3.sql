CREATE OR REPLACE FUNCTION public.notify_staff_new_contact_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title_ar, body_ar, link, severity)
  SELECT DISTINCT ur.user_id,
         'inbox_message',
         'رسالة جديدة من الموقع',
         COALESCE(NEW.name, 'ولي أمر') || COALESCE(' — ' || NEW.subject, ''),
         '/admin/inbox',
         'info'
  FROM public.user_roles ur
  WHERE ur.role IN ('registration_officer', 'principal', 'supervisor', 'admin');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_staff_new_testimonial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title_ar, body_ar, link, severity)
  SELECT DISTINCT ur.user_id,
         'inbox_review',
         'تقييم جديد بانتظار المراجعة',
         COALESCE(NEW.name, 'ولي أمر') || ' — ' || COALESCE(NEW.rating, 5)::text || '/5',
         '/admin/inbox',
         'warning'
  FROM public.user_roles ur
  WHERE ur.role IN ('registration_officer', 'principal', 'supervisor', 'admin');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_new_contact_message ON public.contact_messages;
CREATE TRIGGER trg_notify_staff_new_contact_message
AFTER INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_contact_message();

DROP TRIGGER IF EXISTS trg_notify_staff_new_testimonial ON public.site_testimonials;
CREATE TRIGGER trg_notify_staff_new_testimonial
AFTER INSERT ON public.site_testimonials
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_testimonial();