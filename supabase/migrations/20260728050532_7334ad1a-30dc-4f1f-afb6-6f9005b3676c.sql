ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS correction_sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS correction_note text,
  ADD COLUMN IF NOT EXISTS correction_requested_at timestamptz;