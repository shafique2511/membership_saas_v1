-- Luxantara Members - Phase 10: Membership module lifecycle hardening
-- Additive only. Does not reset or overwrite existing business data.

alter table public.membership_plans
  add column if not exists renewal_setting text not null default 'manual';

alter table public.membership_plans
  drop constraint if exists membership_plans_renewal_setting_check;
alter table public.membership_plans
  add constraint membership_plans_renewal_setting_check
  check (renewal_setting in ('manual', 'auto', 'reminder'));

alter table public.memberships
  add column if not exists frozen_at timestamptz,
  add column if not exists freeze_until date,
  add column if not exists cancelled_at timestamptz,
  add column if not exists previous_plan_id uuid references public.membership_plans(id) on delete set null,
  add column if not exists plan_changed_at timestamptz;

create index if not exists membership_plans_business_active_idx
  on public.membership_plans(business_id, is_active);
create index if not exists memberships_business_status_end_idx
  on public.memberships(business_id, status, end_date);
create index if not exists memberships_customer_status_idx
  on public.memberships(customer_id, status);
create index if not exists membership_usage_membership_created_idx
  on public.membership_usage(membership_id, created_at desc);

create or replace function public.membership_plan_qr_code(
  p_business_id uuid,
  p_customer_id uuid,
  p_plan_id uuid
)
returns text
language sql
volatile
set search_path = public
as $$
  select 'luxantara:membership:' || p_business_id::text || ':' || p_customer_id::text || ':' || p_plan_id::text || ':' || extract(epoch from clock_timestamp())::bigint::text;
$$;

create or replace function public.freeze_membership(target_membership_id uuid, p_freeze_until date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
  v_settings public.membership_settings%rowtype;
begin
  select *
  into v_membership
  from public.memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_membership.business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  select *
  into v_settings
  from public.membership_settings
  where business_id = v_membership.business_id;

  if found and not coalesce(v_settings.allow_freeze, true) then
    raise exception 'Membership freeze is disabled for this business' using errcode = 'P0001';
  end if;

  update public.memberships
  set
    status = 'frozen',
    frozen_at = now(),
    freeze_until = p_freeze_until,
    updated_at = now()
  where id = target_membership_id;
end;
$$;

create or replace function public.unfreeze_membership(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
begin
  select *
  into v_membership
  from public.memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_membership.business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  update public.memberships
  set
    status = 'active',
    frozen_at = null,
    freeze_until = null,
    updated_at = now()
  where id = target_membership_id
    and status = 'frozen';
end;
$$;

create or replace function public.cancel_membership(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
begin
  select *
  into v_membership
  from public.memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_membership.business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  update public.memberships
  set
    status = 'cancelled',
    auto_renew = false,
    cancelled_at = now(),
    updated_at = now()
  where id = target_membership_id;
end;
$$;

create or replace function public.renew_membership(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
  v_plan public.membership_plans%rowtype;
begin
  select *
  into v_membership
  from public.memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_membership.business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  select *
  into v_plan
  from public.membership_plans
  where id = v_membership.plan_id
    and business_id = v_membership.business_id;

  if not found then
    raise exception 'Plan not found' using errcode = 'P0001';
  end if;

  update public.memberships
  set
    status = 'active',
    start_date = current_date,
    end_date = current_date + v_plan.duration_days,
    remaining_credit = case
      when v_plan.plan_type in ('prepaid_credit', 'vip') then v_plan.credit_amount
      else remaining_credit
    end,
    remaining_visits = case
      when v_plan.plan_type in ('subscription', 'visit_package', 'vip') then coalesce(v_plan.visit_limit, remaining_visits)
      else remaining_visits
    end,
    auto_renew = case
      when v_plan.renewal_setting = 'auto' then true
      when v_plan.renewal_setting = 'manual' then false
      else auto_renew
    end,
    frozen_at = null,
    freeze_until = null,
    cancelled_at = null,
    updated_at = now()
  where id = target_membership_id;
end;
$$;

create or replace function public.change_membership_plan(target_membership_id uuid, target_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
  v_plan public.membership_plans%rowtype;
begin
  select *
  into v_membership
  from public.memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_membership.business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  select *
  into v_plan
  from public.membership_plans
  where id = target_plan_id
    and business_id = v_membership.business_id
    and is_active = true;

  if not found then
    raise exception 'Target plan is not available' using errcode = 'P0001';
  end if;

  update public.memberships
  set
    previous_plan_id = plan_id,
    plan_id = target_plan_id,
    status = 'active',
    start_date = current_date,
    end_date = current_date + v_plan.duration_days,
    remaining_credit = v_plan.credit_amount,
    remaining_visits = coalesce(v_plan.visit_limit, 0),
    auto_renew = case
      when v_plan.renewal_setting = 'auto' then true
      when v_plan.renewal_setting = 'manual' then false
      else auto_renew
    end,
    plan_changed_at = now(),
    qr_code = coalesce(qr_code, public.membership_plan_qr_code(business_id, customer_id, target_plan_id)),
    updated_at = now()
  where id = target_membership_id;
end;
$$;

create or replace function public.record_membership_usage(
  p_business_id uuid,
  p_membership_id uuid,
  p_customer_id uuid,
  p_booking_id uuid default null,
  p_usage_type text default 'visit',
  p_amount_used numeric default 0,
  p_visits_used int default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
  v_usage_id uuid;
begin
  if p_usage_type not in ('credit', 'visit', 'discount', 'manual_adjustment') then
    raise exception 'Unsupported membership usage type' using errcode = 'P0001';
  end if;

  if coalesce(p_amount_used, 0) < 0 or coalesce(p_visits_used, 0) < 0 then
    raise exception 'Usage amounts cannot be negative' using errcode = 'P0001';
  end if;

  select *
  into v_membership
  from public.memberships
  where id = p_membership_id
    and business_id = p_business_id
    and customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_membership.business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  if v_membership.status <> 'active' then
    raise exception 'Only active memberships can be used' using errcode = 'P0001';
  end if;

  if coalesce(p_amount_used, 0) > v_membership.remaining_credit then
    raise exception 'Insufficient membership credit' using errcode = 'P0001';
  end if;

  if coalesce(p_visits_used, 0) > v_membership.remaining_visits then
    raise exception 'Insufficient membership visits' using errcode = 'P0001';
  end if;

  insert into public.membership_usage (
    business_id,
    membership_id,
    customer_id,
    booking_id,
    usage_type,
    amount_used,
    visits_used,
    notes
  )
  values (
    p_business_id,
    p_membership_id,
    p_customer_id,
    p_booking_id,
    p_usage_type,
    coalesce(p_amount_used, 0),
    coalesce(p_visits_used, 0),
    p_notes
  )
  returning id into v_usage_id;

  update public.memberships
  set
    remaining_credit = remaining_credit - coalesce(p_amount_used, 0),
    remaining_visits = remaining_visits - coalesce(p_visits_used, 0),
    updated_at = now()
  where id = p_membership_id;

  return v_usage_id;
end;
$$;

create or replace function public.assign_membership(
  p_business_id uuid,
  p_customer_id uuid,
  p_plan_id uuid,
  p_start_date date default current_date,
  p_payment_method text default 'cash',
  p_amount_paid numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.membership_plans%rowtype;
  v_membership_id uuid;
  v_start_date date := coalesce(p_start_date, current_date);
begin
  if not public.business_has_module_access(p_business_id, 'membership') then
    raise exception 'Membership module is not enabled for this business' using errcode = 'P0001';
  end if;

  if not (
    public.has_business_access(p_business_id)
    or public.customer_owns_record(p_customer_id)
  ) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  select *
  into v_plan
  from public.membership_plans
  where id = p_plan_id
    and business_id = p_business_id
    and is_active = true;

  if not found then
    raise exception 'Membership plan is not available' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.customers
    where id = p_customer_id
      and business_id = p_business_id
      and status = 'active'
  ) then
    raise exception 'Customer is not available' using errcode = 'P0001';
  end if;

  insert into public.memberships (
    business_id,
    customer_id,
    plan_id,
    status,
    start_date,
    end_date,
    remaining_credit,
    remaining_visits,
    auto_renew,
    qr_code
  )
  values (
    p_business_id,
    p_customer_id,
    p_plan_id,
    case when coalesce(p_amount_paid, 0) >= v_plan.price then 'active' else 'pending_payment' end,
    v_start_date,
    v_start_date + v_plan.duration_days,
    v_plan.credit_amount,
    coalesce(v_plan.visit_limit, 0),
    v_plan.renewal_setting = 'auto',
    public.membership_plan_qr_code(p_business_id, p_customer_id, p_plan_id)
  )
  returning id into v_membership_id;

  if coalesce(p_amount_paid, 0) > 0 then
    insert into public.payments (
      business_id,
      customer_id,
      reference_type,
      reference_id,
      payment_method,
      amount,
      status,
      paid_at
    )
    values (
      p_business_id,
      p_customer_id,
      'membership',
      v_membership_id,
      p_payment_method,
      p_amount_paid,
      case when p_amount_paid >= v_plan.price then 'paid' else 'pending' end,
      case when p_amount_paid >= v_plan.price then now() else null end
    );
  end if;

  return v_membership_id;
end;
$$;

create or replace function public.award_membership_points_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
begin
  select points_bonus
  into v_points
  from public.membership_plans
  where id = new.plan_id
    and business_id = new.business_id;

  if coalesce(v_points, 0) > 0 and new.status in ('active', 'pending_payment') then
    insert into public.loyalty_transactions (
      business_id,
      customer_id,
      transaction_type,
      points,
      description,
      reference_id
    )
    values (
      new.business_id,
      new.customer_id,
      'earn',
      v_points,
      'Membership points bonus',
      new.id
    );

    update public.customers
    set points_balance = points_balance + v_points,
        updated_at = now()
    where id = new.customer_id
      and business_id = new.business_id;
  end if;

  return new;
end;
$$;

drop trigger if exists award_membership_points_bonus_trigger on public.memberships;
create trigger award_membership_points_bonus_trigger
  after insert on public.memberships
  for each row
  execute function public.award_membership_points_bonus();

create or replace function public.seed_default_membership_plans(
  p_business_id uuid,
  p_business_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_business_access(p_business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  if lower(coalesce(p_business_type, '')) in ('barber', 'barber_shop', 'barber shop') then
    insert into public.membership_plans (business_id, name, plan_type, description, price, duration_days, visit_limit, benefits, renewal_setting)
    select p_business_id, 'Basic Cut Plan', 'subscription', 'RM49/month, 2 haircuts/month', 49, 30, 2, '{"included":"2 haircuts per month"}'::jsonb, 'manual'
    where not exists (select 1 from public.membership_plans where business_id = p_business_id and name = 'Basic Cut Plan');

    insert into public.membership_plans (business_id, name, plan_type, description, price, duration_days, visit_limit, benefits, renewal_setting)
    select p_business_id, 'Premium Grooming', 'subscription', 'RM99/month, 4 haircuts/month', 99, 30, 4, '{"included":"4 haircuts per month"}'::jsonb, 'manual'
    where not exists (select 1 from public.membership_plans where business_id = p_business_id and name = 'Premium Grooming');

    insert into public.membership_plans (business_id, name, plan_type, description, price, duration_days, visit_limit, benefits, renewal_setting)
    select p_business_id, '10 Haircut Package', 'visit_package', 'RM200, 10 visits', 200, 365, 10, '{"included":"10 haircut visits"}'::jsonb, 'manual'
    where not exists (select 1 from public.membership_plans where business_id = p_business_id and name = '10 Haircut Package');
  end if;

  if lower(coalesce(p_business_type, '')) in ('coffee', 'coffee_shop', 'coffee shop') then
    insert into public.membership_plans (business_id, name, plan_type, description, price, duration_days, visit_limit, benefits, renewal_setting)
    select p_business_id, 'Coffee Lover', 'subscription', 'RM39/month, 10 drinks/month', 39, 30, 10, '{"included":"10 drinks per month"}'::jsonb, 'manual'
    where not exists (select 1 from public.membership_plans where business_id = p_business_id and name = 'Coffee Lover');

    insert into public.membership_plans (business_id, name, plan_type, description, price, duration_days, visit_limit, benefits, renewal_setting)
    select p_business_id, 'Daily Coffee', 'subscription', 'RM99/month, 1 drink per day', 99, 30, 30, '{"included":"1 drink per day"}'::jsonb, 'manual'
    where not exists (select 1 from public.membership_plans where business_id = p_business_id and name = 'Daily Coffee');

    insert into public.membership_plans (business_id, name, plan_type, description, price, duration_days, credit_amount, benefits, renewal_setting)
    select p_business_id, 'Prepaid RM100 Credit', 'prepaid_credit', 'Pay RM100 get RM110 credit', 100, 365, 110, '{"bonus_credit":10}'::jsonb, 'manual'
    where not exists (select 1 from public.membership_plans where business_id = p_business_id and name = 'Prepaid RM100 Credit');
  end if;
end;
$$;

grant execute on function public.freeze_membership(uuid, date) to authenticated;
grant execute on function public.unfreeze_membership(uuid) to authenticated;
grant execute on function public.cancel_membership(uuid) to authenticated;
grant execute on function public.renew_membership(uuid) to authenticated;
grant execute on function public.change_membership_plan(uuid, uuid) to authenticated;
grant execute on function public.record_membership_usage(uuid, uuid, uuid, uuid, text, numeric, int, text) to authenticated;
grant execute on function public.assign_membership(uuid, uuid, uuid, date, text, numeric) to authenticated;
grant execute on function public.seed_default_membership_plans(uuid, text) to authenticated;
