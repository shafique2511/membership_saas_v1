-- Phase 23: Deposit and no-show protection.
-- Additive no-show risk scoring, deposit enforcement, cancellation deadline, reset, and audit logs.

alter table public.booking_rules
  add column if not exists cancellation_deadline_hours int not null default 24 check (cancellation_deadline_hours >= 0),
  add column if not exists no_show_high_risk_threshold int not null default 3 check (no_show_high_risk_threshold >= 1),
  add column if not exists high_risk_deposit_required boolean not null default true,
  add column if not exists high_risk_deposit_percentage numeric(5,2) not null default 50 check (high_risk_deposit_percentage >= 0 and high_risk_deposit_percentage <= 100);

alter table public.customers
  add column if not exists is_high_risk boolean not null default false,
  add column if not exists high_risk_reason text,
  add column if not exists high_risk_marked_at timestamptz,
  add column if not exists no_show_reset_at timestamptz,
  add column if not exists no_show_reset_by uuid references auth.users(id) on delete set null;

alter table public.bookings
  add column if not exists deposit_required_reason text,
  add column if not exists deposit_override_by uuid references auth.users(id) on delete set null,
  add column if not exists deposit_override_at timestamptz,
  add column if not exists cancellation_deadline_at timestamptz;

create table if not exists public.no_show_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  action text not null check (action in ('marked_no_show', 'reverted_no_show', 'marked_high_risk', 'reset_no_show_count', 'deposit_override')),
  previous_no_show_count int,
  new_no_show_count int,
  previous_high_risk boolean,
  new_high_risk boolean,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customers_business_high_risk_idx
  on public.customers(business_id, is_high_risk, no_show_count);
create index if not exists bookings_business_deposit_reason_idx
  on public.bookings(business_id, deposit_required_reason)
  where deposit_required_reason is not null;
create index if not exists no_show_actions_business_created_idx
  on public.no_show_actions(business_id, created_at desc);
create index if not exists no_show_actions_customer_idx
  on public.no_show_actions(customer_id, created_at desc)
  where customer_id is not null;

alter table public.no_show_actions enable row level security;

drop policy if exists "no show actions tenant read" on public.no_show_actions;
create policy "no show actions tenant read" on public.no_show_actions
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'booking')
  and public.has_staff_permission(business_id, 'bookings.view')
);

drop policy if exists "no show actions tenant insert" on public.no_show_actions;
create policy "no show actions tenant insert" on public.no_show_actions
for insert to authenticated
with check (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'booking')
  and public.has_staff_permission(business_id, 'bookings.edit')
);

create or replace function public.no_show_customer_is_high_risk(p_customer public.customers, p_rules public.booking_rules)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_customer.is_high_risk, false)
    or coalesce(p_customer.no_show_count, 0) >= coalesce(p_rules.no_show_high_risk_threshold, 3)
$$;

create or replace function public.apply_no_show_customer_risk(
  p_business_id uuid,
  p_customer_id uuid,
  p_booking_id uuid,
  p_action text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_rules public.booking_rules%rowtype;
  v_old_count int;
  v_new_count int;
  v_old_high_risk boolean;
  v_new_high_risk boolean;
begin
  if p_customer_id is null then
    return;
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id
    and business_id = p_business_id
  for update;

  if not found then
    return;
  end if;

  select * into v_rules from public.booking_rules where business_id = p_business_id;
  if not found then
    insert into public.booking_rules (business_id)
    values (p_business_id)
    on conflict (business_id) do nothing;

    select * into v_rules from public.booking_rules where business_id = p_business_id;
  end if;

  v_old_count := coalesce(v_customer.no_show_count, 0);
  v_old_high_risk := coalesce(v_customer.is_high_risk, false);

  if p_action = 'marked_no_show' then
    v_new_count := v_old_count + 1;
  elsif p_action = 'reverted_no_show' then
    v_new_count := greatest(0, v_old_count - 1);
  else
    v_new_count := v_old_count;
  end if;

  v_new_high_risk := v_old_high_risk or v_new_count >= coalesce(v_rules.no_show_high_risk_threshold, 3);

  update public.customers
  set no_show_count = v_new_count,
      is_high_risk = v_new_high_risk,
      high_risk_reason = case
        when v_new_high_risk then coalesce(high_risk_reason, 'Reached no-show threshold')
        else high_risk_reason
      end,
      high_risk_marked_at = case
        when v_new_high_risk and high_risk_marked_at is null then now()
        else high_risk_marked_at
      end,
      updated_at = now()
  where id = p_customer_id;

  insert into public.no_show_actions (
    business_id,
    customer_id,
    booking_id,
    action,
    previous_no_show_count,
    new_no_show_count,
    previous_high_risk,
    new_high_risk,
    notes,
    created_by
  )
  values (
    p_business_id,
    p_customer_id,
    p_booking_id,
    p_action,
    v_old_count,
    v_new_count,
    v_old_high_risk,
    v_new_high_risk,
    p_notes,
    auth.uid()
  );

  if not v_old_high_risk and v_new_high_risk then
    insert into public.no_show_actions (
      business_id,
      customer_id,
      booking_id,
      action,
      previous_no_show_count,
      new_no_show_count,
      previous_high_risk,
      new_high_risk,
      notes,
      created_by
    )
    values (
      p_business_id,
      p_customer_id,
      p_booking_id,
      'marked_high_risk',
      v_old_count,
      v_new_count,
      false,
      true,
      'Customer reached no-show threshold.',
      auth.uid()
    );
  end if;
end;
$$;

create or replace function public.handle_no_show_customer_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'no_show' then
    perform public.apply_no_show_customer_risk(new.business_id, new.customer_id, new.id, 'marked_no_show', 'Booking marked as no-show.');
  elsif tg_op = 'UPDATE' and old.status = 'no_show' and new.status is distinct from 'no_show' then
    perform public.apply_no_show_customer_risk(new.business_id, new.customer_id, new.id, 'reverted_no_show', 'Booking no-show status was reverted.');
  end if;

  return new;
end;
$$;

drop trigger if exists no_show_customer_risk_after_status on public.bookings;
create trigger no_show_customer_risk_after_status
  after update of status on public.bookings
  for each row execute function public.handle_no_show_customer_risk();

create or replace function public.reset_customer_no_show_count(
  p_customer_id uuid,
  p_clear_high_risk boolean default true,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
begin
  select * into v_customer
  from public.customers
  where id = p_customer_id
  for update;

  if not found then
    raise exception 'Customer not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_customer.business_id)
    or public.user_role(auth.uid()) not in ('owner', 'manager', 'super_admin')
  then
    raise exception 'Not allowed to reset no-show count' using errcode = 'P0001';
  end if;

  update public.customers
  set no_show_count = 0,
      is_high_risk = case when p_clear_high_risk then false else is_high_risk end,
      high_risk_reason = case when p_clear_high_risk then null else high_risk_reason end,
      high_risk_marked_at = case when p_clear_high_risk then null else high_risk_marked_at end,
      no_show_reset_at = now(),
      no_show_reset_by = auth.uid(),
      updated_at = now()
  where id = p_customer_id;

  insert into public.no_show_actions (
    business_id,
    customer_id,
    action,
    previous_no_show_count,
    new_no_show_count,
    previous_high_risk,
    new_high_risk,
    notes,
    created_by
  )
  values (
    v_customer.business_id,
    v_customer.id,
    'reset_no_show_count',
    v_customer.no_show_count,
    0,
    v_customer.is_high_risk,
    case when p_clear_high_risk then false else v_customer.is_high_risk end,
    p_notes,
    auth.uid()
  );
end;
$$;

create or replace function public.override_booking_deposit_requirement(
  p_booking_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_booking.business_id)
    or public.user_role(auth.uid()) not in ('owner', 'manager', 'super_admin')
  then
    raise exception 'Not allowed to override deposit requirement' using errcode = 'P0001';
  end if;

  update public.bookings
  set deposit_required_reason = null,
      deposit_override_by = auth.uid(),
      deposit_override_at = now(),
      notes = concat_ws(E'\n', notes, p_notes),
      updated_at = now()
  where id = p_booking_id;

  insert into public.no_show_actions (
    business_id,
    customer_id,
    booking_id,
    action,
    notes,
    created_by
  )
  values (
    v_booking.business_id,
    v_booking.customer_id,
    v_booking.id,
    'deposit_override',
    coalesce(p_notes, 'Deposit requirement manually overridden.'),
    auth.uid()
  );
end;
$$;

create or replace function public.enforce_deposit_no_show_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rules public.booking_rules%rowtype;
  v_customer public.customers%rowtype;
  v_service_price numeric(12,2) := 0;
  v_required_deposit numeric(12,2) := 0;
  v_is_high_risk boolean := false;
begin
  if new.status in ('cancelled', 'no_show') then
    return new;
  end if;

  select * into v_rules from public.booking_rules where business_id = new.business_id;
  if not found then
    insert into public.booking_rules (business_id)
    values (new.business_id)
    on conflict (business_id) do nothing;

    select * into v_rules from public.booking_rules where business_id = new.business_id;
  end if;

  if new.customer_id is not null then
    select * into v_customer
    from public.customers
    where id = new.customer_id
      and business_id = new.business_id;

    if found then
      v_is_high_risk := public.no_show_customer_is_high_risk(v_customer, v_rules);
    end if;
  end if;

  if new.service_id is not null then
    select coalesce(price, 0)
    into v_service_price
    from public.services
    where id = new.service_id
      and business_id = new.business_id;
  end if;

  if coalesce(new.total_amount, 0) > 0 then
    v_service_price := coalesce(new.total_amount, 0);
  end if;

  if coalesce(v_rules.deposit_required, false) then
    v_required_deposit := greatest(v_required_deposit, round(v_service_price * coalesce(v_rules.deposit_percentage, 0) / 100, 2));
    new.deposit_required_reason := coalesce(new.deposit_required_reason, 'business_required');
  end if;

  if v_is_high_risk and coalesce(v_rules.high_risk_deposit_required, true) then
    v_required_deposit := greatest(v_required_deposit, round(v_service_price * coalesce(v_rules.high_risk_deposit_percentage, 50) / 100, 2));
    new.deposit_required_reason := 'high_risk_no_show';
  end if;

  if v_required_deposit > coalesce(new.deposit_amount, 0)
    and new.deposit_override_by is null
  then
    new.deposit_amount := v_required_deposit;
  end if;

  if new.cancellation_deadline_at is null
    and coalesce(v_rules.cancellation_deadline_hours, 0) > 0
  then
    new.cancellation_deadline_at := (new.booking_date::timestamp + new.start_time) - make_interval(hours => v_rules.cancellation_deadline_hours);
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_deposit_no_show_protection_before_write on public.bookings;
create trigger enforce_deposit_no_show_protection_before_write
  before insert or update of business_id, customer_id, service_id, booking_date, start_time, deposit_amount, total_amount, status
  on public.bookings
  for each row execute function public.enforce_deposit_no_show_protection();

create or replace function public.create_guest_booking(
  p_business_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_staff_id uuid,
  p_service_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_notes text default null,
  p_branch_id uuid default null,
  p_resource_id uuid default null,
  p_booking_type text default 'appointment'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_booking_id uuid;
  v_total_amount numeric(12,2) := 0;
  v_deposit_amount numeric(12,2) := 0;
  v_status text := 'pending';
  v_rules public.booking_rules%rowtype;
begin
  if not exists (
    select 1
    from public.businesses
    where id = p_business_id
      and status = 'active'
  ) then
    raise exception 'Business is not available';
  end if;

  if not public.business_has_module_access(p_business_id, 'booking') then
    raise exception 'Booking module is not enabled for this business';
  end if;

  if nullif(trim(p_full_name), '') is null or nullif(trim(p_phone), '') is null then
    raise exception 'Name and phone are required';
  end if;

  if p_booking_type not in ('appointment', 'table', 'room', 'event', 'walk_in') then
    raise exception 'Unsupported booking type';
  end if;

  select *
  into v_rules
  from public.booking_rules
  where business_id = p_business_id;

  if not found then
    insert into public.booking_rules (business_id)
    values (p_business_id)
    on conflict (business_id) do nothing;

    select *
    into v_rules
    from public.booking_rules
    where business_id = p_business_id;
  end if;

  select id into v_customer_id
  from public.customers
  where business_id = p_business_id
    and (
      phone = trim(p_phone)
      or (nullif(trim(p_email), '') is not null and email = nullif(trim(p_email), ''))
    )
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers (business_id, full_name, phone, email, status)
    values (p_business_id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), 'active')
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        email = coalesce(nullif(trim(p_email), ''), email),
        updated_at = now()
    where id = v_customer_id;
  end if;

  select coalesce(price, 0)
  into v_total_amount
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and is_active = true
    and is_bookable = true;

  v_total_amount := coalesce(v_total_amount, 0);
  if coalesce(v_rules.deposit_required, false) then
    v_deposit_amount := round(v_total_amount * coalesce(v_rules.deposit_percentage, 0) / 100, 2);
  end if;
  if coalesce(v_rules.auto_confirm, false) then
    v_status := 'confirmed';
  end if;

  insert into public.bookings (
    business_id,
    branch_id,
    customer_id,
    staff_id,
    service_id,
    resource_id,
    booking_type,
    booking_date,
    start_time,
    end_time,
    deposit_amount,
    total_amount,
    status,
    notes
  )
  values (
    p_business_id,
    p_branch_id,
    v_customer_id,
    p_staff_id,
    p_service_id,
    p_resource_id,
    p_booking_type,
    p_booking_date,
    p_start_time,
    p_end_time,
    v_deposit_amount,
    v_total_amount,
    v_status,
    p_notes
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

create or replace function public.upsert_booking_rules(
  p_business_id uuid,
  p_slot_duration_minutes int default null,
  p_buffer_time_minutes int default null,
  p_min_booking_notice_hours int default null,
  p_max_advance_days int default null,
  p_auto_confirm boolean default null,
  p_deposit_required boolean default null,
  p_deposit_percentage numeric default null,
  p_cancellation_policy text default null,
  p_cancellation_fee_amount numeric default null,
  p_allow_walk_in boolean default null,
  p_max_guests_per_booking int default null,
  p_cancellation_deadline_hours int default null,
  p_no_show_high_risk_threshold int default null,
  p_high_risk_deposit_required boolean default null,
  p_high_risk_deposit_percentage numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_business_access(p_business_id) then
    raise exception 'Not allowed';
  end if;

  insert into public.booking_rules (business_id) values (p_business_id)
  on conflict (business_id) do nothing;

  update public.booking_rules set
    slot_duration_minutes = coalesce(p_slot_duration_minutes, booking_rules.slot_duration_minutes),
    buffer_time_minutes = coalesce(p_buffer_time_minutes, booking_rules.buffer_time_minutes),
    min_booking_notice_hours = coalesce(p_min_booking_notice_hours, booking_rules.min_booking_notice_hours),
    max_advance_days = coalesce(p_max_advance_days, booking_rules.max_advance_days),
    auto_confirm = coalesce(p_auto_confirm, booking_rules.auto_confirm),
    deposit_required = coalesce(p_deposit_required, booking_rules.deposit_required),
    deposit_percentage = coalesce(p_deposit_percentage, booking_rules.deposit_percentage),
    cancellation_policy = coalesce(p_cancellation_policy, booking_rules.cancellation_policy),
    cancellation_fee_amount = coalesce(p_cancellation_fee_amount, booking_rules.cancellation_fee_amount),
    allow_walk_in = coalesce(p_allow_walk_in, booking_rules.allow_walk_in),
    max_guests_per_booking = coalesce(p_max_guests_per_booking, booking_rules.max_guests_per_booking),
    cancellation_deadline_hours = coalesce(p_cancellation_deadline_hours, booking_rules.cancellation_deadline_hours),
    no_show_high_risk_threshold = coalesce(p_no_show_high_risk_threshold, booking_rules.no_show_high_risk_threshold),
    high_risk_deposit_required = coalesce(p_high_risk_deposit_required, booking_rules.high_risk_deposit_required),
    high_risk_deposit_percentage = coalesce(p_high_risk_deposit_percentage, booking_rules.high_risk_deposit_percentage),
    updated_at = now()
  where business_id = p_business_id
  returning to_jsonb(booking_rules.*) into v_result;

  return v_result;
end;
$$;

grant execute on function public.reset_customer_no_show_count(uuid, boolean, text) to authenticated;
grant execute on function public.override_booking_deposit_requirement(uuid, text) to authenticated;
grant execute on function public.upsert_booking_rules(uuid, int, int, int, int, boolean, boolean, numeric, text, numeric, boolean, int, int, int, boolean, numeric) to authenticated;
revoke execute on function public.apply_no_show_customer_risk(uuid, uuid, uuid, text, text) from public, anon, authenticated;
