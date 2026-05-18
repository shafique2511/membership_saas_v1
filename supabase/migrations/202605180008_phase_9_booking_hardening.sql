-- Luxantara Members - Phase 9: Booking module hardening
-- Additive safeguards only. Does not reset data or replace existing records.

alter table public.booking_rules
  add column if not exists max_bookings_per_slot int not null default 1 check (max_bookings_per_slot > 0),
  add column if not exists reschedule_limit int not null default 2 check (reschedule_limit >= 0);

create index if not exists bookings_business_date_time_idx
  on public.bookings(business_id, booking_date, start_time, end_time);

create index if not exists bookings_resource_id_idx
  on public.bookings(resource_id);

create or replace function public.booking_time_minutes(p_time time)
returns int
language sql
immutable
set search_path = public
as $$
  select (extract(hour from p_time)::int * 60) + extract(minute from p_time)::int;
$$;

create or replace function public.enforce_booking_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_rules public.booking_rules%rowtype;
  v_day text;
  v_booking_start timestamp;
  v_start_min int;
  v_end_min int;
  v_buffer int;
  v_branch_hours jsonb;
  v_staff_hours jsonb;
  v_staff_off_days jsonb;
  v_resource_capacity int := 1;
  v_conflicts int := 0;
begin
  if new.status in ('cancelled', 'no_show') then
    return new;
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = new.business_id
      and b.status = 'active'
  ) then
    raise exception 'Business is not available';
  end if;

  if not public.business_has_module_access(new.business_id, 'booking') then
    raise exception 'Booking module is not enabled for this business';
  end if;

  select *
  into v_rules
  from public.booking_rules
  where business_id = new.business_id;

  if not found then
    insert into public.booking_rules (business_id)
    values (new.business_id)
    on conflict (business_id) do nothing;

    select *
    into v_rules
    from public.booking_rules
    where business_id = new.business_id;
  end if;

  v_day := lower(to_char(new.booking_date, 'FMDay'));
  v_booking_start := new.booking_date::timestamp + new.start_time;
  v_start_min := public.booking_time_minutes(new.start_time);
  v_end_min := public.booking_time_minutes(new.end_time);
  v_buffer := coalesce(v_rules.buffer_time_minutes, 0);

  if new.booking_type = 'walk_in' and not coalesce(v_rules.allow_walk_in, true) then
    raise exception 'Walk-in booking is disabled for this business';
  end if;

  if tg_op = 'INSERT' and new.booking_type <> 'walk_in' then
    if v_booking_start < (now() + make_interval(hours => coalesce(v_rules.min_booking_notice_hours, 0))) then
      raise exception 'Booking does not meet the minimum notice period';
    end if;

    if new.booking_date > (current_date + coalesce(v_rules.max_advance_days, 30)) then
      raise exception 'Booking is beyond the maximum advance booking window';
    end if;
  end if;

  if new.service_id is not null and not exists (
    select 1 from public.services s
    where s.id = new.service_id
      and s.business_id = new.business_id
      and s.is_active = true
      and s.is_bookable = true
  ) then
    raise exception 'Selected service is not available';
  end if;

  if new.branch_id is not null then
    select b.opening_hours -> v_day
    into v_branch_hours
    from public.branches b
    where b.id = new.branch_id
      and b.business_id = new.business_id
      and b.status = 'active';

    if v_branch_hours is null then
      raise exception 'Selected branch is not available';
    end if;

    if v_branch_hours ? 'open'
      and v_branch_hours ? 'close'
      and (
        new.start_time < ((v_branch_hours ->> 'open')::time)
        or new.end_time > ((v_branch_hours ->> 'close')::time)
      )
    then
      raise exception 'Booking is outside branch opening hours';
    end if;
  end if;

  if new.staff_id is not null then
    select s.working_hours -> v_day, s.off_days
    into v_staff_hours, v_staff_off_days
    from public.staff s
    where s.id = new.staff_id
      and s.business_id = new.business_id
      and s.status = 'active';

    if v_staff_hours is null and v_staff_off_days is null then
      raise exception 'Selected staff is not available';
    end if;

    if coalesce(v_staff_off_days, '[]'::jsonb) ? v_day
      or coalesce(v_staff_off_days, '[]'::jsonb) ? new.booking_date::text
    then
      raise exception 'Selected staff is off on this date';
    end if;

    if v_staff_hours ? 'start'
      and v_staff_hours ? 'end'
      and (
        new.start_time < ((v_staff_hours ->> 'start')::time)
        or new.end_time > ((v_staff_hours ->> 'end')::time)
      )
    then
      raise exception 'Booking is outside staff working hours';
    end if;

    select count(*)
    into v_conflicts
    from public.bookings b
    where b.business_id = new.business_id
      and b.booking_date = new.booking_date
      and b.status not in ('cancelled', 'no_show')
      and b.staff_id = new.staff_id
      and b.id <> new.id
      and public.booking_time_minutes(new.start_time) < public.booking_time_minutes(b.end_time) + v_buffer
      and public.booking_time_minutes(new.end_time) > public.booking_time_minutes(b.start_time) - v_buffer;

    if v_conflicts > 0 then
      raise exception 'Booking slot conflicts with this staff schedule';
    end if;
  end if;

  if new.resource_id is not null then
    select r.capacity
    into v_resource_capacity
    from public.bookable_resources r
    where r.id = new.resource_id
      and r.business_id = new.business_id
      and r.status = 'active';

    if v_resource_capacity is null then
      raise exception 'Selected resource is not available';
    end if;

    select count(*)
    into v_conflicts
    from public.bookings b
    where b.business_id = new.business_id
      and b.booking_date = new.booking_date
      and b.status not in ('cancelled', 'no_show')
      and b.resource_id = new.resource_id
      and b.id <> new.id
      and public.booking_time_minutes(new.start_time) < public.booking_time_minutes(b.end_time) + v_buffer
      and public.booking_time_minutes(new.end_time) > public.booking_time_minutes(b.start_time) - v_buffer;

    if v_conflicts >= greatest(1, v_resource_capacity) then
      raise exception 'Booking slot conflicts with this resource schedule';
    end if;
  end if;

  if new.staff_id is null and new.resource_id is null then
    select count(*)
    into v_conflicts
    from public.bookings b
    where b.business_id = new.business_id
      and b.booking_date = new.booking_date
      and b.status not in ('cancelled', 'no_show')
      and b.id <> new.id
      and public.booking_time_minutes(new.start_time) < public.booking_time_minutes(b.end_time) + v_buffer
      and public.booking_time_minutes(new.end_time) > public.booking_time_minutes(b.start_time) - v_buffer;

    if v_conflicts >= greatest(1, coalesce(v_rules.max_bookings_per_slot, 1)) then
      raise exception 'Maximum bookings per slot reached';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_booking_rules_trigger on public.bookings;
create trigger enforce_booking_rules_trigger
  before insert or update of business_id, branch_id, staff_id, service_id, resource_id, booking_type, booking_date, start_time, end_time, status
  on public.bookings
  for each row
  execute function public.enforce_booking_rules();

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

  insert into public.customers (business_id, full_name, phone, email, status)
  values (p_business_id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), 'active')
  returning id into v_customer_id;

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

grant execute on function public.create_guest_booking(uuid, text, text, text, uuid, uuid, date, time, time, text, uuid, uuid, text) to anon, authenticated;
