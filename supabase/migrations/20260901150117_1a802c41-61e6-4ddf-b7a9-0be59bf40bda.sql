ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS reports_visible_to_parents boolean NOT NULL DEFAULT false;