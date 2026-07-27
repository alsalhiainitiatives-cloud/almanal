-- 1) Secure per-application track token
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS track_token text;

UPDATE public.applications
SET track_token = encode(gen_random_bytes(12), 'hex')
WHERE track_token IS NULL;

ALTER TABLE public.applications
  ALTER COLUMN track_token SET DEFAULT encode(gen_random_bytes(12), 'hex');

ALTER TABLE public.applications
  ALTER COLUMN track_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS applications_track_token_key
  ON public.applications (track_token);

-- 2) Public tracking now requires number + token
DROP FUNCTION IF EXISTS public.track_application_public(text);
DROP FUNCTION IF EXISTS public.track_application_events_public(text);

CREATE OR REPLACE FUNCTION public.track_application_public(
  _application_number text,
  _token text
)
RETURNS TABLE(
  id uuid,
  application_number text,
  status application_status,
  academic_year text,
  submitted_at timestamp with time zone,
  updated_at timestamp with time zone,
  student_initial text,
  needs_action boolean,
  open_document_requests integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    a.id,
    a.application_number,
    a.status,
    a.academic_year,
    a.submitted_at,
    a.updated_at,
    COALESCE((
      SELECT left(c.name_ar, 1) FROM public.application_children c
      WHERE c.application_id = a.id ORDER BY c.created_at LIMIT 1
    ), '؟') AS student_initial,
    (a.status = 'needs_action') AS needs_action,
    (
      SELECT COUNT(*)::int FROM public.document_requests dr
      WHERE dr.application_id = a.id AND dr.fulfilled_at IS NULL
    ) AS open_document_requests
  FROM public.applications a
  WHERE a.application_number IS NOT NULL
    AND upper(trim(a.application_number)) = upper(trim(_application_number))
    AND _token IS NOT NULL
    AND length(trim(_token)) >= 16
    AND a.track_token = lower(trim(_token))
    AND a.status <> 'draft'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.track_application_events_public(
  _application_number text,
  _token text
)
RETURNS TABLE(
  id uuid,
  title_ar text,
  event_type text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.title_ar, e.event_type, e.created_at
  FROM public.application_events e
  JOIN public.applications a ON a.id = e.application_id
  WHERE a.application_number IS NOT NULL
    AND upper(trim(a.application_number)) = upper(trim(_application_number))
    AND _token IS NOT NULL
    AND length(trim(_token)) >= 16
    AND a.track_token = lower(trim(_token))
    AND a.status <> 'draft'
  ORDER BY e.created_at ASC
  LIMIT 60;
$$;

-- 3) Public list of pending document requests (no PII)
CREATE OR REPLACE FUNCTION public.track_application_documents_public(
  _application_number text,
  _token text
)
RETURNS TABLE(
  id uuid,
  document_name_ar text,
  note text,
  requested_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    dr.id,
    COALESCE(dt.name_ar, dr.document_type_slug) AS document_name_ar,
    dr.note,
    dr.created_at AS requested_at
  FROM public.document_requests dr
  JOIN public.applications a ON a.id = dr.application_id
  LEFT JOIN public.document_types dt ON dt.slug = dr.document_type_slug
  WHERE dr.fulfilled_at IS NULL
    AND a.application_number IS NOT NULL
    AND upper(trim(a.application_number)) = upper(trim(_application_number))
    AND _token IS NOT NULL
    AND length(trim(_token)) >= 16
    AND a.track_token = lower(trim(_token))
    AND a.status <> 'draft'
  ORDER BY dr.created_at ASC
  LIMIT 40;
$$;

REVOKE ALL ON FUNCTION public.track_application_public(text, text) FROM public;
REVOKE ALL ON FUNCTION public.track_application_events_public(text, text) FROM public;
REVOKE ALL ON FUNCTION public.track_application_documents_public(text, text) FROM public;

GRANT EXECUTE ON FUNCTION public.track_application_public(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_application_events_public(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_application_documents_public(text, text) TO anon, authenticated, service_role;