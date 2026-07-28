CREATE OR REPLACE FUNCTION public.admin_set_role_permission(_role app_role, _permission_key text, _granted boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.key = _permission_key) THEN
    RAISE EXCEPTION 'unknown_permission';
  END IF;

  IF _granted THEN
    INSERT INTO public.role_permissions (role, permission_key)
    VALUES (_role, _permission_key)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.role_permissions
    WHERE role = _role AND permission_key = _permission_key;
  END IF;

  RETURN true;
END;
$$;