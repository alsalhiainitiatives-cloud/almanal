ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS max_waiting integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS teacher_qualification text,
  ADD COLUMN IF NOT EXISTS teacher_experience text,
  ADD COLUMN IF NOT EXISTS teachers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;