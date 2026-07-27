-- 1) Document scope (parent-level vs per-child)
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'child';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_types_scope_check'
  ) THEN
    ALTER TABLE public.document_types
      ADD CONSTRAINT document_types_scope_check CHECK (scope IN ('parent','child'));
  END IF;
END $$;

UPDATE public.document_types
SET scope = 'parent'
WHERE slug IN ('parent-id','parent-iqama','residence-proof');

UPDATE public.document_types
SET scope = 'child'
WHERE slug NOT IN ('parent-id','parent-iqama','residence-proof');

-- 2) Per-child document uploads
ALTER TABLE public.application_documents
  ADD COLUMN IF NOT EXISTS child_index INTEGER;

DROP INDEX IF EXISTS application_documents_unique_slug;
CREATE UNIQUE INDEX IF NOT EXISTS application_documents_unique_scope
  ON public.application_documents (application_id, document_type_slug, COALESCE(child_index, -1));

-- 3) Classroom preferences per child
ALTER TABLE public.application_children
  ADD COLUMN IF NOT EXISTS preference_1_classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preference_2_classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preference_3_classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL;

-- 4) Parent relationship free-text when "other"
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS parent_relationship TEXT,
  ADD COLUMN IF NOT EXISTS parent_relationship_other TEXT;

-- 5) Infants: Small Kids stage accepts children from one month old
UPDATE public.stages SET min_age_months = 1 WHERE slug = 'small-kids';
UPDATE public.classrooms SET min_age_months = 1 WHERE slug = 'class-white';