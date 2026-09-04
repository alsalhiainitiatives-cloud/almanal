-- 1) Survey targeting (all parents / specific stages / specific classrooms)
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS audience_kind text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_stage_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_classroom_ids uuid[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'surveys_audience_kind_check') THEN
    ALTER TABLE public.surveys
      ADD CONSTRAINT surveys_audience_kind_check
      CHECK (audience_kind IN ('all','stages','classrooms'));
  END IF;
END $$;

-- 2) Human-friendly reference code on every parent submission
ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS reference_code text;

UPDATE public.survey_responses
SET reference_code = 'SV-' || upper(substr(md5(id::text), 1, 8))
WHERE reference_code IS NULL;

ALTER TABLE public.survey_responses
  ALTER COLUMN reference_code SET DEFAULT ('SV-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)));

CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_reference_code_key
  ON public.survey_responses (reference_code);

-- 3) Confirmation notification for the parent right after a successful submission
CREATE OR REPLACE FUNCTION public.notify_parent_survey_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
BEGIN
  SELECT title INTO _title FROM public.surveys WHERE id = NEW.survey_id;
  PERFORM public.dispatch_notification(
    ARRAY[NEW.parent_id]::uuid[],
    ARRAY[]::app_role[],
    'survey_submitted',
    'تم استلام إجابتك على الاستبانة',
    'شكرًا لمشاركتك في «' || coalesce(_title, 'استبانة') || '». الرقم المرجعي: ' || coalesce(NEW.reference_code, '—'),
    NULL,
    '/surveys',
    'success'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_parent_survey_submitted ON public.survey_responses;
CREATE TRIGGER trg_notify_parent_survey_submitted
AFTER INSERT ON public.survey_responses
FOR EACH ROW EXECUTE FUNCTION public.notify_parent_survey_submitted();

-- 4) Parent portal permission for the new surveys page
INSERT INTO public.permissions (key, category, module_name, sub_module_name, action, description_ar, sort_order)
VALUES ('portal.surveys', 'general', 'general', 'portal', 'read', 'إظهار «استبانات أولياء الأمور»', 908)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
VALUES ('parent', 'portal.surveys')
ON CONFLICT DO NOTHING;