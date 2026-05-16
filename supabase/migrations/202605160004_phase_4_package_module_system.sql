-- Luxantara Members - Phase 4 package/module access and usage enforcement

create or replace function public.get_business_limit(target_business_id uuid, target_module_key text, target_limit_key text)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select max(nullif(bma.limit_config ->> target_limit_key, '')::int)
  from public.business_module_access bma
  where bma.business_id = target_business_id
    and bma.module_key = target_module_key
    and bma.is_enabled = true
    and bma.access_level <> 'none'
    and bma.start_date <= current_date
    and (bma.end_date is null or bma.end_date >= current_date)
    and jsonb_typeof(bma.limit_config -> target_limit_key) = 'number'
$$;

create or replace function public.assert_business_limit(target_business_id uuid, target_module_key text, target_limit_key text, current_count int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_limit int;
begin
  allowed_limit := public.get_business_limit(target_business_id, target_module_key, target_limit_key);

  if allowed_limit is not null and current_count >= allowed_limit then
    raise exception 'Package limit exceeded for %. Current limit: %', target_limit_key, allowed_limit
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.upsert_usage_counter(
  target_business_id uuid,
  target_module_key text,
  target_usage_key text,
  increment_by int,
  target_limit int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start_date date := date_trunc('month', current_date)::date;
  period_end_date date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  insert into public.usage_counters (
    business_id,
    module_key,
    usage_key,
    used_count,
    limit_count,
    period_start,
    period_end
  )
  values (
    target_business_id,
    target_module_key,
    target_usage_key,
    greatest(increment_by, 0),
    target_limit,
    period_start_date,
    period_end_date
  )
  on conflict (business_id, module_key, usage_key, period_start, period_end)
  do update set
    used_count = public.usage_counters.used_count + greatest(increment_by, 0),
    limit_count = coalesce(excluded.limit_count, public.usage_counters.limit_count),
    updated_at = now();
end;
$$;

create or replace function public.assert_monthly_usage_limit(
  target_business_id uuid,
  target_module_key text,
  target_usage_key text,
  target_limit_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_limit int;
  current_usage int;
  period_start_date date := date_trunc('month', current_date)::date;
  period_end_date date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  allowed_limit := public.get_business_limit(target_business_id, target_module_key, target_limit_key);

  if allowed_limit is null then
    perform public.upsert_usage_counter(target_business_id, target_module_key, target_usage_key, 1, null);
    return;
  end if;

  select coalesce(uc.used_count, 0)
  into current_usage
  from public.usage_counters uc
  where uc.business_id = target_business_id
    and uc.module_key = target_module_key
    and uc.usage_key = target_usage_key
    and uc.period_start = period_start_date
    and uc.period_end = period_end_date;

  current_usage := coalesce(current_usage, 0);

  if current_usage >= allowed_limit then
    raise exception 'Package usage limit exceeded for %. Current limit: %', target_usage_key, allowed_limit
      using errcode = 'P0001';
  end if;

  perform public.upsert_usage_counter(target_business_id, target_module_key, target_usage_key, 1, allowed_limit);
end;
$$;

create or replace function public.apply_business_package(target_business_id uuid, target_package_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_package_slug text;
begin
  if not (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(target_business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  ) then
    raise exception 'You cannot change this business package' using errcode = 'P0001';
  end if;

  select slug into selected_package_slug
  from public.packages
  where id = target_package_id
    and is_active = true;

  if selected_package_slug is null then
    raise exception 'Package is inactive or missing' using errcode = 'P0001';
  end if;

  update public.business_subscriptions
  set status = 'cancelled', end_date = current_date
  where business_id = target_business_id
    and status in ('trial', 'active', 'past_due');

  insert into public.business_subscriptions (
    business_id,
    package_id,
    status,
    billing_cycle,
    start_date,
    next_billing_date
  )
  values (
    target_business_id,
    target_package_id,
    'active',
    'monthly',
    current_date,
    current_date + interval '1 month'
  );

  delete from public.business_module_access
  where business_id = target_business_id
    and source = 'package';

  insert into public.business_module_access (
    business_id,
    module_key,
    access_level,
    source,
    limit_config,
    is_enabled,
    start_date
  )
  select
    target_business_id,
    m.module_key,
    pm.access_level,
    'package',
    pm.limit_config,
    true,
    current_date
  from public.package_modules pm
  join public.modules m on m.id = pm.module_id
  where pm.package_id = target_package_id
    and pm.is_enabled = true;

  perform public.upsert_usage_counter(
    target_business_id,
    'booking',
    'bookings_per_month',
    0,
    public.get_business_limit(target_business_id, 'booking', 'bookings_per_month')
  );

  perform public.upsert_usage_counter(
    target_business_id,
    'notification',
    'whatsapp_messages_per_month',
    0,
    public.get_business_limit(target_business_id, 'notification', 'whatsapp_messages_per_month')
  );
end;
$$;

grant execute on function public.apply_business_package(uuid, uuid) to authenticated;

create or replace function public.enforce_branch_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  if not public.has_module_access(new.business_id, 'core')
    and exists (select 1 from public.business_module_access where business_id = new.business_id)
  then
    raise exception 'Core module is not enabled for this business' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
  from public.branches
  where business_id = new.business_id;

  perform public.assert_business_limit(new.business_id, 'core', 'branches', existing_count);
  perform public.upsert_usage_counter(new.business_id, 'core', 'branches', 1, public.get_business_limit(new.business_id, 'core', 'branches'));
  return new;
end;
$$;

create or replace function public.enforce_staff_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  if not public.has_module_access(new.business_id, 'core') then
    raise exception 'Core module is not enabled for this business' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
  from public.staff
  where business_id = new.business_id
    and status = 'active';

  perform public.assert_business_limit(new.business_id, 'core', 'staff', existing_count);
  perform public.upsert_usage_counter(new.business_id, 'core', 'staff', 1, public.get_business_limit(new.business_id, 'core', 'staff'));
  return new;
end;
$$;

create or replace function public.enforce_customer_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  if not public.has_module_access(new.business_id, 'core') then
    raise exception 'Core module is not enabled for this business' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
  from public.customers
  where business_id = new.business_id
    and status = 'active';

  perform public.assert_business_limit(new.business_id, 'core', 'customers', existing_count);
  perform public.upsert_usage_counter(new.business_id, 'core', 'customers', 1, public.get_business_limit(new.business_id, 'core', 'customers'));
  return new;
end;
$$;

create or replace function public.enforce_booking_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_module_access(new.business_id, 'booking') then
    raise exception 'Booking module is not enabled for this business' using errcode = 'P0001';
  end if;

  perform public.assert_monthly_usage_limit(new.business_id, 'booking', 'bookings_per_month', 'bookings_per_month');
  return new;
end;
$$;

create or replace function public.enforce_notification_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_module_access(new.business_id, 'notification') then
    raise exception 'Notification module is not enabled for this business' using errcode = 'P0001';
  end if;

  if new.channel = 'whatsapp' then
    perform public.assert_monthly_usage_limit(
      new.business_id,
      'notification',
      'whatsapp_messages_per_month',
      'whatsapp_messages_per_month'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_branch_package_limit_before_insert on public.branches;
create trigger enforce_branch_package_limit_before_insert
before insert on public.branches
for each row execute function public.enforce_branch_package_limit();

drop trigger if exists enforce_staff_package_limit_before_insert on public.staff;
create trigger enforce_staff_package_limit_before_insert
before insert on public.staff
for each row execute function public.enforce_staff_package_limit();

drop trigger if exists enforce_customer_package_limit_before_insert on public.customers;
create trigger enforce_customer_package_limit_before_insert
before insert on public.customers
for each row execute function public.enforce_customer_package_limit();

drop trigger if exists enforce_booking_package_limit_before_insert on public.bookings;
create trigger enforce_booking_package_limit_before_insert
before insert on public.bookings
for each row execute function public.enforce_booking_package_limit();

drop trigger if exists enforce_notification_package_limit_before_insert on public.notifications;
create trigger enforce_notification_package_limit_before_insert
before insert on public.notifications
for each row execute function public.enforce_notification_package_limit();
