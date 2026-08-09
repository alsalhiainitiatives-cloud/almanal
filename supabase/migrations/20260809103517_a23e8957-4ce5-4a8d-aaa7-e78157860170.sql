create or replace function public.recount_classroom_seats()
returns void
language sql
security definer
set search_path = public
as $$
  with counts as (
    select c.id,
      (
        (select count(*) from public.application_children ac
           join public.applications a on a.id = ac.application_id
          where ac.classroom_id = c.id
            and a.archived_at is null
            and a.status in ('submitted','under_review','needs_action','principal_review','waitlisted','approved'))
        +
        (select count(*) from public.seat_reservation_children src
           join public.seat_reservations r on r.id = src.reservation_id
          where src.assigned_classroom_id = c.id
            and src.waitlisted = false
            and r.status = 'approved'
            and r.application_id is null)
      )::int as n
    from public.classrooms c
  )
  update public.classrooms c
     set taken_seats = counts.n
    from counts
   where counts.id = c.id
     and c.taken_seats is distinct from counts.n;
$$;

create or replace function public.recount_stage_seats()
returns void
language sql
security definer
set search_path = public
as $$
  with agg as (
    select s.id, coalesce((select sum(c.taken_seats)::int from public.classrooms c where c.stage_id = s.id), 0) as n
    from public.stages s
  )
  update public.stages s
     set taken_seats = agg.n
    from agg
   where agg.id = s.id
     and s.taken_seats is distinct from agg.n;
$$;

create or replace function public.tg_recount_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recount_classroom_seats();
  perform public.recount_stage_seats();
  return null;
end;
$$;

drop trigger if exists trg_recount_seats_children on public.application_children;
create trigger trg_recount_seats_children
after insert or delete or update of classroom_id on public.application_children
for each row execute function public.tg_recount_seats();

drop trigger if exists trg_recount_seats_apps on public.applications;
create trigger trg_recount_seats_apps
after update of status, archived_at on public.applications
for each row
when (old.status is distinct from new.status or old.archived_at is distinct from new.archived_at)
execute function public.tg_recount_seats();

drop trigger if exists trg_recount_seats_apps_del on public.applications;
create trigger trg_recount_seats_apps_del
after delete on public.applications
for each row execute function public.tg_recount_seats();

drop trigger if exists trg_recount_seats_res_children on public.seat_reservation_children;
create trigger trg_recount_seats_res_children
after insert or delete or update of assigned_classroom_id, waitlisted on public.seat_reservation_children
for each row execute function public.tg_recount_seats();

drop trigger if exists trg_recount_seats_res on public.seat_reservations;
create trigger trg_recount_seats_res
after insert or delete or update of status, application_id on public.seat_reservations
for each row execute function public.tg_recount_seats();

grant execute on function public.recount_classroom_seats() to authenticated, service_role;
grant execute on function public.recount_stage_seats() to authenticated, service_role;

select public.recount_classroom_seats();
select public.recount_stage_seats();