REVOKE ALL ON FUNCTION public.study_plan_classroom_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.study_plan_published(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_plan_classroom_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.study_plan_published(uuid) TO authenticated, service_role;