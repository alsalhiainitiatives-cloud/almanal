CREATE TABLE public.admission_seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year text NOT NULL,
  name_ar text NOT NULL,
  kind text NOT NULL DEFAULT 'regular',
  status text NOT NULL DEFAULT 'draft',
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days'),
  reservation_enabled boolean NOT NULL DEFAULT true,
  closure_message text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admission_seasons_kind_check CHECK (kind IN ('regular','supplementary')),
  CONSTRAINT admission_seasons_status_check CHECK (status IN ('draft','open','closed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_seasons TO authenticated;
GRANT SELECT ON public.admission_seasons TO anon;
GRANT ALL ON public.admission_seasons TO service_role;

ALTER TABLE public.admission_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see open seasons"
ON public.admission_seasons FOR SELECT
USING (status = 'open');

CREATE POLICY "Staff can read all seasons"
ON public.admission_seasons FOR SELECT
TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff can create seasons"
ON public.admission_seasons FOR INSERT
TO authenticated
WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff can update seasons"
ON public.admission_seasons FOR UPDATE
TO authenticated
USING (public.is_school_staff(auth.uid()))
WITH CHECK (public.is_school_staff(auth.uid()));

CREATE POLICY "Staff can delete seasons"
ON public.admission_seasons FOR DELETE
TO authenticated
USING (public.is_school_staff(auth.uid()));

CREATE UNIQUE INDEX admission_seasons_year_kind_key
  ON public.admission_seasons (academic_year, kind);

CREATE TRIGGER admission_seasons_updated
BEFORE UPDATE ON public.admission_seasons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.applications
  ADD COLUMN season_id uuid REFERENCES public.admission_seasons(id) ON DELETE SET NULL;
ALTER TABLE public.seat_reservations
  ADD COLUMN season_id uuid REFERENCES public.admission_seasons(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.active_admission_season()
RETURNS TABLE(
  id uuid,
  academic_year text,
  name_ar text,
  kind text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  reservation_enabled boolean,
  closure_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.academic_year, s.name_ar, s.kind, s.starts_at, s.ends_at,
         s.reservation_enabled, s.closure_message
  FROM public.admission_seasons s
  WHERE s.status = 'open'
    AND now() >= s.starts_at
    AND now() <= s.ends_at
  ORDER BY (s.kind = 'regular') DESC, s.ends_at ASC
  LIMIT 1;
$$;