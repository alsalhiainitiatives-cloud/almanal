CREATE OR REPLACE FUNCTION public.track_application_public(_application_number text)
RETURNS TABLE(
  id uuid,
  application_number text,
  status application_status,
  academic_year text,
  submitted_at timestamptz,
  updated_at timestamptz,
  student_initial text,
  needs_action boolean,
  open_document_requests integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
    AND a.status <> 'draft'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.track_application_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.track_application_public(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_application_events_public(_application_number text)
RETURNS TABLE(id uuid, title_ar text, event_type text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.title_ar, e.event_type, e.created_at
  FROM public.application_events e
  JOIN public.applications a ON a.id = e.application_id
  WHERE a.application_number IS NOT NULL
    AND upper(trim(a.application_number)) = upper(trim(_application_number))
    AND a.status <> 'draft'
  ORDER BY e.created_at ASC
  LIMIT 60;
$$;

REVOKE ALL ON FUNCTION public.track_application_events_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.track_application_events_public(text) TO anon, authenticated;