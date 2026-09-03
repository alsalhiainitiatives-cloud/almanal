REVOKE EXECUTE ON FUNCTION public.unlink_child_guardian(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.unlink_child_guardian(uuid) TO authenticated, service_role;