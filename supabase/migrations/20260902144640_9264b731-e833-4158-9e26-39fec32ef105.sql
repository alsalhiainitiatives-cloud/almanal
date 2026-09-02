REVOKE ALL ON FUNCTION public.admin_set_role_permissions_bulk(app_role, text[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_role_permissions_bulk(app_role, text[], boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role_permissions_bulk(app_role, text[], boolean) TO authenticated;