-- Luxantara Members - Phase 8 Membership Module Enhancements

alter table public.memberships drop constraint memberships_status_check;
alter table public.memberships add constraint memberships_status_check
  check (status in ('active', 'expired', 'frozen', 'cancelled', 'pending_payment'));

create or replace function public.renew_membership(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  p record;
begin
  select * into m from public.memberships where id = target_membership_id;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  select * into p from public.membership_plans where id = m.plan_id;
  if not found then
    raise exception 'Plan not found' using errcode = 'P0001';
  end if;

  update public.memberships
  set
    status = 'active',
    start_date = current_date,
    end_date = current_date + p.duration_days,
    remaining_credit = case
      when p.plan_type in ('prepaid_credit', 'vip') then p.credit_amount
      else remaining_credit
    end,
    remaining_visits = case
      when p.plan_type in ('visit_package', 'vip') then coalesce(p.visit_limit, remaining_visits)
      else remaining_visits
    end,
    updated_at = now()
  where id = target_membership_id;
end;
$$;

grant execute on function public.renew_membership(uuid) to authenticated;
