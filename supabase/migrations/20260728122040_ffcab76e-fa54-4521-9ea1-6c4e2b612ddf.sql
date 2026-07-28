CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title_ar text NOT NULL,
  body_ar text,
  link text,
  severity text NOT NULL DEFAULT 'info',
  actor_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Staff-callable dispatcher: fan out one notification to explicit users and/or roles.
CREATE OR REPLACE FUNCTION public.dispatch_notification(
  _user_ids uuid[],
  _roles app_role[],
  _kind text,
  _title_ar text,
  _body_ar text DEFAULT NULL,
  _application_id uuid DEFAULT NULL,
  _link text DEFAULT NULL,
  _severity text DEFAULT 'info'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_targets uuid[];
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT t), '{}') INTO v_targets
  FROM (
    SELECT unnest(COALESCE(_user_ids, '{}'::uuid[])) AS t
    UNION
    SELECT ur.user_id FROM public.user_roles ur
    WHERE _roles IS NOT NULL AND ur.role = ANY(_roles)
  ) s
  WHERE t IS NOT NULL;

  IF array_length(v_targets, 1) IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, application_id, kind, title_ar, body_ar, link, severity, actor_id)
  SELECT u, _application_id, _kind, _title_ar, _body_ar, _link, COALESCE(_severity, 'info'), auth.uid()
  FROM unnest(v_targets) AS u
  WHERE u <> auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND (_ids IS NULL OR array_length(_ids, 1) IS NULL OR id = ANY(_ids));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;