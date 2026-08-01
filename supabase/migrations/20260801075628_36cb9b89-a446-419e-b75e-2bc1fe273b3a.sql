CREATE TABLE public.site_testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'ولي أمر',
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX site_testimonials_status_idx ON public.site_testimonials (status, created_at DESC);

GRANT SELECT ON public.site_testimonials TO anon;
GRANT SELECT, INSERT ON public.site_testimonials TO authenticated;
GRANT ALL ON public.site_testimonials TO service_role;

ALTER TABLE public.site_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved testimonials are public"
  ON public.site_testimonials FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Users can read their own testimonials"
  ON public.site_testimonials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can read all testimonials"
  ON public.site_testimonials FOR SELECT
  TO authenticated
  USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Users can submit their own testimonial"
  ON public.site_testimonials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Staff can moderate testimonials"
  ON public.site_testimonials FOR UPDATE
  TO authenticated
  USING (public.is_school_staff(auth.uid()))
  WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff can delete testimonials"
  ON public.site_testimonials FOR DELETE
  TO authenticated
  USING (public.is_school_staff(auth.uid()));

CREATE TRIGGER update_site_testimonials_updated_at
  BEFORE UPDATE ON public.site_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.submit_site_testimonial(_name text, _role text, _quote text, _rating integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF length(trim(COALESCE(_quote, ''))) < 10 THEN
    RAISE EXCEPTION 'quote_too_short';
  END IF;

  IF (SELECT count(*) FROM public.site_testimonials
      WHERE user_id = auth.uid() AND created_at > now() - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO public.site_testimonials (user_id, name, role, quote, rating, status)
  VALUES (
    auth.uid(),
    left(trim(COALESCE(NULLIF(trim(_name), ''), 'ولي أمر')), 80),
    left(trim(COALESCE(NULLIF(trim(_role), ''), 'ولي أمر')), 80),
    left(trim(_quote), 1000),
    LEAST(GREATEST(COALESCE(_rating, 5), 1), 5),
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;