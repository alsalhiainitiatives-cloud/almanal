REVOKE ALL ON FUNCTION public.subject_classroom_id(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.topic_classroom_id(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_read_classroom_curriculum(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_write_classroom_curriculum(uuid, uuid) FROM anon;