INSERT INTO public.permissions (key, category, module_name, sub_module_name, action, description_ar, sort_order)
VALUES ('guardians.unlink', 'students', 'students', 'guardians', 'delete', 'إلغاء ربط طفل بولي أمر', 0)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key)
SELECT r, 'guardians.unlink'
FROM unnest(ARRAY['admin','principal','supervisor','registration_officer']::app_role[]) AS r
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.unlink_child_guardian(_child_id uuid)
RETURNS TABLE(child_names text[], guardian_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app uuid;
  v_owner uuid;
  v_new_owner uuid;
  v_names text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT a.id, a.parent_id INTO v_app, v_owner
  FROM public.application_children c
  JOIN public.applications a ON a.id = c.application_id
  WHERE c.id = _child_id
  LIMIT 1;

  IF v_app IS NULL THEN RAISE EXCEPTION 'child_not_found'; END IF;

  IF v_owner <> v_uid AND NOT public.has_permission(v_uid, 'guardians.unlink') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF public.is_school_staff(v_owner) THEN
    RAISE EXCEPTION 'not_linked';
  END IF;

  SELECT COALESCE(
    (SELECT i.created_by FROM public.parent_invitations i
      WHERE i.application_id = v_app AND i.created_by IS NOT NULL
        AND public.is_school_staff(i.created_by)
      ORDER BY i.created_at DESC LIMIT 1),
    (SELECT v_uid WHERE public.is_school_staff(v_uid)),
    (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
      ORDER BY ur.created_at LIMIT 1)
  ) INTO v_new_owner;

  IF v_new_owner IS NULL THEN RAISE EXCEPTION 'no_custodian'; END IF;

  UPDATE public.applications
  SET parent_id = v_new_owner, updated_at = now()
  WHERE id = v_app;

  UPDATE public.parent_invitations
  SET status = 'revoked', accepted_by = NULL, accepted_at = NULL, updated_at = now()
  WHERE application_id = v_app AND status = 'accepted';

  SELECT COALESCE(array_agg(c.name_ar ORDER BY c.name_ar), '{}') INTO v_names
  FROM public.application_children c WHERE c.application_id = v_app;

  RETURN QUERY SELECT v_names, v_owner;
END;
$$;