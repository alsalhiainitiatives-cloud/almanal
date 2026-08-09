revoke all on function public.recount_classroom_seats() from public, anon;
revoke all on function public.recount_stage_seats() from public, anon;
revoke all on function public.tg_recount_seats() from public, anon;
grant execute on function public.recount_classroom_seats() to authenticated, service_role;
grant execute on function public.recount_stage_seats() to authenticated, service_role;