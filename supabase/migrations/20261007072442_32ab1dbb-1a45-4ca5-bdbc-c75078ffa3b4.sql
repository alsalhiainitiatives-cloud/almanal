CREATE OR REPLACE FUNCTION public.is_school_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('registration_officer','accountant','principal','supervisor','admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.custom_roles cr ON cr.id = ucr.custom_role_id
    WHERE ucr.user_id = _user_id AND cr.is_active = true
  )
$$;