REVOKE EXECUTE ON FUNCTION public.can_access_private_chat(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_private_chat(uuid, uuid) TO authenticated, service_role;