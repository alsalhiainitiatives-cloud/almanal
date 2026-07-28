REVOKE EXECUTE ON FUNCTION public.acquire_classroom_lock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_classroom_lock(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_my_classroom_locks() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.active_classroom_locks() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.acquire_classroom_lock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_classroom_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_my_classroom_locks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_classroom_locks() TO authenticated;