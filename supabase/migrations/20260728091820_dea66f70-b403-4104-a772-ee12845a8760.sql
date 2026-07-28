CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view user permission overrides"
ON public.user_permissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT up.granted FROM public.user_permissions up
      WHERE up.user_id = _user_id AND up.permission_key = _permission),
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id AND rp.permission_key = _permission
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS TABLE(permission_key text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT rp.permission_key
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.permission_key = rp.permission_key
        AND up.granted = false
    )
  UNION
  SELECT up.permission_key
  FROM public.user_permissions up
  WHERE up.user_id = auth.uid() AND up.granted = true;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_set_user_permissions(
  _user_ids uuid[],
  _permission_keys text[],
  _action text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL
     OR _permission_keys IS NULL OR array_length(_permission_keys, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF _action NOT IN ('grant', 'revoke', 'reset') THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  IF _action = 'reset' THEN
    DELETE FROM public.user_permissions
    WHERE user_id = ANY(_user_ids) AND permission_key = ANY(_permission_keys);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  INSERT INTO public.user_permissions (user_id, permission_key, granted, created_by)
  SELECT u, k, (_action = 'grant'), auth.uid()
  FROM unnest(_user_ids) AS u
  CROSS JOIN unnest(_permission_keys) AS k
  WHERE EXISTS (SELECT 1 FROM public.permissions p WHERE p.key = k)
  ON CONFLICT (user_id, permission_key)
  DO UPDATE SET granted = EXCLUDED.granted, created_by = EXCLUDED.created_by, updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;