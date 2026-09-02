ALTER TABLE public.assessment_evidences
  ADD COLUMN IF NOT EXISTS external_url text;

ALTER TABLE public.assessment_evidences
  ALTER COLUMN file_path DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_assessment_evidence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.file_path IS NULL OR length(trim(NEW.file_path)) = 0)
     AND (NEW.external_url IS NULL OR length(trim(NEW.external_url)) = 0) THEN
    RAISE EXCEPTION 'evidence_requires_file_or_url';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assessment_evidences_validate ON public.assessment_evidences;
CREATE TRIGGER assessment_evidences_validate
  BEFORE INSERT OR UPDATE ON public.assessment_evidences
  FOR EACH ROW EXECUTE FUNCTION public.validate_assessment_evidence();