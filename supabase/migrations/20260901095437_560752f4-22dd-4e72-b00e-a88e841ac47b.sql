CREATE TABLE IF NOT EXISTS public.academics_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.academics_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.academics_settings TO authenticated;
GRANT ALL ON public.academics_settings TO service_role;

ALTER TABLE public.academics_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read academics settings"
ON public.academics_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can write academics settings"
ON public.academics_settings FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'supervisor')
  OR public.has_role(auth.uid(), 'principal')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'supervisor')
  OR public.has_role(auth.uid(), 'principal')
);

CREATE TRIGGER update_academics_settings_updated_at
BEFORE UPDATE ON public.academics_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT true;

INSERT INTO public.academics_settings (key, value)
VALUES
  ('month_colors', '[{"month":1,"hex":"#0000FF","label":"أزرق"},{"month":2,"hex":"#FF0000","label":"أحمر"},{"month":3,"hex":"#800080","label":"بنفسجي"},{"month":4,"hex":"#008000","label":"أخضر"},{"month":5,"hex":"#FFA500","label":"برتقالي"},{"month":6,"hex":"#000000","label":"أسود"},{"month":7,"hex":"#800000","label":"عنّابي"},{"month":8,"hex":"#FFD700","label":"ذهبي"},{"month":9,"hex":"#FFFF00","label":"أصفر"},{"month":10,"hex":"#ADD8E6","label":"أزرق فاتح"},{"month":11,"hex":"#FFC0CB","label":"زهري"},{"month":12,"hex":"#A52A2A","label":"بنّي"}]'::jsonb),
  ('chat', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;