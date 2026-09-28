REVOKE EXECUTE ON FUNCTION public.admin_upsert_custom_role(uuid, text, text, text, text, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_custom_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_custom_role_permissions(uuid, text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_custom_roles(uuid, uuid[]) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_upsert_custom_role(uuid, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_custom_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_custom_role_permissions(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_custom_roles(uuid, uuid[]) TO authenticated;