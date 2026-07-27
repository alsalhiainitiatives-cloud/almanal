CREATE OR REPLACE FUNCTION public.admin_set_user_roles(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;

  IF _roles IS NOT NULL AND array_length(_roles, 1) > 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT _user_id, r FROM unnest(_roles) AS r
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_roles(uuid, app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_roles(uuid, app_role[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_my_other_sessions(_user_agent text, _ip text)
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

  UPDATE public.user_sessions
  SET revoked_at = now()
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL
    AND (user_agent IS DISTINCT FROM _user_agent OR ip_address IS DISTINCT FROM _ip);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_my_other_sessions(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_my_other_sessions(text, text) TO authenticated;