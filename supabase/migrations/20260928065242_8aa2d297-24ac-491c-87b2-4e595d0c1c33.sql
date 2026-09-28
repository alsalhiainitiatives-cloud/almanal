CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS TABLE(permission_key text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  SELECT DISTINCT crp.permission_key
  FROM public.user_custom_roles ucr
  JOIN public.custom_roles cr ON cr.id = ucr.custom_role_id AND cr.is_active
  JOIN public.custom_role_permissions crp ON crp.custom_role_id = cr.id
  WHERE ucr.user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = auth.uid()
        AND up.permission_key = crp.permission_key
        AND up.granted = false
    )
  UNION
  SELECT up.permission_key
  FROM public.user_permissions up
  WHERE up.user_id = auth.uid() AND up.granted = true;
$function$;