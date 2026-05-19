-- Phase 22: Waitlist system.
-- Additive waitlist hardening, public join RPC, owner conversion RPC, and cancellation notification.

alter table public.waitlist_entries
  add column if not exists booking_type text not null default 'appointment',
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists resource_id uuid references public.bookable_resources(id) on delete set null,
  add column if not exists notified_at timestamptz,
  add column if not exists converted_booking_id uuid references public.bookings(id) on delete set null;

alter table public.waitlist_entries drop constraint if exists waitlist_entries_status_check;
update public.waitlist_entries
set status = 'notified',
    notified_at = coalesce(notified_at, updated_at, now())
where status = 'offered';
alter table public.waitlist_entries
  add constraint waitlist_entries_status_check
  check (status in ('waiting', 'notified', 'booked', 'expired', 'cancelled'));

alter table public.waitlist_entries drop constraint if exists waitlist_entries_booking_type_check;
alter table public.waitlist_entries
  add constraint waitlist_entries_booking_type_check
  check (booking_type in ('appointment', 'table', 'room', 'event', 'walk_in'));

create index if not exists waitlist_entries_waiting_match_idx
  on public.waitlist_entries(business_id, status, requested_date, service_id, staff_id, resource_id, created_at)
  where status = 'waiting';
create index if not exists waitlist_entries_resource_id_idx on public.waitlist_entries(resource_id);
create index if not exists waitlist_entries_converted_booking_id_idx on public.waitlist_entries(converted_booking_id);

drop policy if exists "waitlist tenant all" on public.waitlist_entries;
drop policy if exists "waitlist tenant read" on public.waitlist_entries;
create policy "waitlist tenant read" on public.waitlist_entries
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'booking')
  and public.has_staff_permission(business_id, 'bookings.view')
);

drop policy if exists "waitlist tenant write" on public.waitlist_entries;
create policy "waitlist tenant write" on public.waitlist_entries
for all to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'booking')
  and (
    public.has_staff_permission(business_id, 'bookings.create')
    or public.has_staff_permission(business_id, 'bookings.edit')
    or public.has_staff_permission(business_id, 'bookings.manage')
  )
)
with check (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'booking')
  and (
    public.has_staff_permission(business_id, 'bookings.create')
    or public.has_staff_permission(business_id, 'bookings.edit')
    or public.has_staff_permission(business_id, 'bookings.manage')
  )
);

create or replace function public.seed_phase22_waitlist_templates(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_business_access(p_business_id) and not public.is_super_admin(auth.uid()) then
    raise exception 'Not allowed to seed waitlist templates' using errcode = 'P0001';
  end if;

  insert into public.notification_templates (business_id, notification_type, channel, subject, body, variables, is_default, is_active)
  values (
    p_business_id,
    'waitlist_slot_available',
    'whatsapp',
    null,
    'Hi {customer_name}, a slot is now available at {business_name} for {service_name} on {booking_date} at {booking_time}. Reply to confirm.',
    '["customer_name","business_name","service_name","booking_date","booking_time"]'::jsonb,
    true,
    true
  )
  on conflict (business_id, notification_type, channel) do update set
    body = excluded.body,
    variables = excluded.variables,
    is_default = true,
    is_active = true,
    updated_at = now();
end;
$$;

create or replace function public.create_waitlist_entry(
  p_business_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_branch_id uuid default null,
  p_staff_id uuid default null,
  p_service_id uuid default null,
  p_resource_id uuid default null,
  p_booking_type text default 'appointment',
  p_requested_date date default null,
  p_requested_time_start time default null,
  p_requested_time_end time default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_waitlist_id uuid;
begin
  if not public.business_has_module_access(p_business_id, 'booking') then
    raise exception 'Booking module is not enabled for this business' using errcode = 'P0001';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Customer name is required' using errcode = 'P0001';
  end if;

  if nullif(trim(p_phone), '') is null then
    raise exception 'Customer phone is required' using errcode = 'P0001';
  end if;

  if p_branch_id is not null and not exists (
    select 1 from public.branches where id = p_branch_id and business_id = p_business_id
  ) then
    raise exception 'Invalid branch for this business' using errcode = 'P0001';
  end if;

  if p_service_id is not null and not exists (
    select 1 from public.services where id = p_service_id and business_id = p_business_id
  ) then
    raise exception 'Invalid service for this business' using errcode = 'P0001';
  end if;

  if p_staff_id is not null and not exists (
    select 1 from public.staff where id = p_staff_id and business_id = p_business_id
  ) then
    raise exception 'Invalid staff for this business' using errcode = 'P0001';
  end if;

  if p_resource_id is not null and not exists (
    select 1 from public.bookable_resources where id = p_resource_id and business_id = p_business_id
  ) then
    raise exception 'Invalid resource for this business' using errcode = 'P0001';
  end if;

  select id into v_customer_id
  from public.customers
  where business_id = p_business_id
    and (
      phone = nullif(trim(p_phone), '')
      or (p_email is not null and email = nullif(trim(p_email), ''))
    )
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.customers (business_id, branch_id, full_name, phone, email)
    values (p_business_id, p_branch_id, trim(p_full_name), trim(p_phone), nullif(trim(coalesce(p_email, '')), ''))
    returning id into v_customer_id;
  end if;

  insert into public.waitlist_entries (
    business_id,
    branch_id,
    customer_id,
    service_id,
    staff_id,
    resource_id,
    booking_type,
    customer_name,
    customer_phone,
    customer_email,
    requested_date,
    requested_time_start,
    requested_time_end,
    status,
    notes
  )
  values (
    p_business_id,
    p_branch_id,
    v_customer_id,
    p_service_id,
    p_staff_id,
    p_resource_id,
    coalesce(p_booking_type, 'appointment'),
    trim(p_full_name),
    trim(p_phone),
    nullif(trim(coalesce(p_email, '')), ''),
    p_requested_date,
    p_requested_time_start,
    p_requested_time_end,
    'waiting',
    p_notes
  )
  returning id into v_waitlist_id;

  return v_waitlist_id;
end;
$$;

create or replace function public.convert_waitlist_to_booking(p_waitlist_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.waitlist_entries%rowtype;
  v_rules public.booking_rules%rowtype;
  v_booking_id uuid;
  v_end_time time;
begin
  select * into v_entry from public.waitlist_entries where id = p_waitlist_id;
  if not found then
    raise exception 'Waitlist entry not found' using errcode = 'P0001';
  end if;

  if not public.has_business_access(v_entry.business_id) and not public.is_super_admin(auth.uid()) then
    raise exception 'Not allowed to convert this waitlist entry' using errcode = 'P0001';
  end if;

  if not public.has_staff_permission(v_entry.business_id, 'bookings.create') then
    raise exception 'Missing booking create permission' using errcode = 'P0001';
  end if;

  if v_entry.status not in ('waiting', 'notified') then
    raise exception 'Only waiting or notified waitlist entries can be converted' using errcode = 'P0001';
  end if;

  if v_entry.requested_date is null or v_entry.requested_time_start is null then
    raise exception 'Preferred date and time are required before converting to booking' using errcode = 'P0001';
  end if;

  select * into v_rules from public.booking_rules where business_id = v_entry.business_id limit 1;
  v_end_time := coalesce(
    v_entry.requested_time_end,
    (v_entry.requested_time_start + (coalesce(v_rules.slot_duration_minutes, 30) * interval '1 minute'))::time
  );

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
    status,
    notes
  )
  values (
    v_entry.business_id,
    v_entry.branch_id,
    v_entry.customer_id,
    v_entry.staff_id,
    v_entry.service_id,
    v_entry.resource_id,
    v_entry.booking_type,
    v_entry.requested_date,
    v_entry.requested_time_start,
    v_end_time,
    case when coalesce(v_rules.auto_confirm, true) then 'confirmed' else 'pending' end,
    concat_ws(E'\n', v_entry.notes, 'Converted from waitlist.')
  )
  returning id into v_booking_id;

  update public.waitlist_entries
  set status = 'booked',
      converted_booking_id = v_booking_id,
      updated_at = now()
  where id = v_entry.id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    v_entry.business_id,
    auth.uid(),
    'waitlist.convert_to_booking',
    'waitlist_entries',
    v_entry.id,
    to_jsonb(v_entry),
    jsonb_build_object('booking_id', v_booking_id, 'status', 'booked')
  );

  return v_booking_id;
end;
$$;

create or replace function public.notify_next_waitlist_customer(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_entry public.waitlist_entries%rowtype;
  v_business public.businesses%rowtype;
  v_service public.services%rowtype;
  v_notification_id uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or v_booking.status <> 'cancelled' then
    return null;
  end if;

  select *
  into v_entry
  from public.waitlist_entries
  where business_id = v_booking.business_id
    and status = 'waiting'
    and (requested_date is null or requested_date = v_booking.booking_date)
    and (branch_id is null or branch_id is not distinct from v_booking.branch_id)
    and (service_id is null or service_id is not distinct from v_booking.service_id)
    and (staff_id is null or staff_id is not distinct from v_booking.staff_id)
    and (resource_id is null or resource_id is not distinct from v_booking.resource_id)
    and (
      requested_time_start is null
      or requested_time_end is null
      or (requested_time_start < v_booking.end_time and requested_time_end > v_booking.start_time)
    )
    and (expires_at is null or expires_at > now())
  order by priority desc, created_at asc
  limit 1;

  if not found then
    return null;
  end if;

  update public.waitlist_entries
  set status = 'notified',
      notified_at = now(),
      updated_at = now()
  where id = v_entry.id;

  if public.business_has_module_access(v_booking.business_id, 'notification') and nullif(coalesce(v_entry.customer_phone, ''), '') is not null then
    select * into v_business from public.businesses where id = v_booking.business_id;
    select * into v_service from public.services where id = v_booking.service_id;

    v_notification_id := public.log_templated_notification_attempt(
      v_booking.business_id,
      v_entry.customer_id,
      'waitlist_slot_available',
      'whatsapp',
      v_entry.customer_phone,
      jsonb_build_object(
        'customer_name', coalesce(v_entry.customer_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business'),
        'service_name', coalesce(v_service.name, 'Service'),
        'booking_date', v_booking.booking_date::text,
        'booking_time', left(v_booking.start_time::text, 5)
      ),
      'waitlist',
      v_entry.id
    );
  end if;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    v_booking.business_id,
    auth.uid(),
    'waitlist.notify_next',
    'waitlist_entries',
    v_entry.id,
    to_jsonb(v_entry),
    jsonb_build_object('status', 'notified', 'notification_id', v_notification_id, 'cancelled_booking_id', p_booking_id)
  );

  return v_entry.id;
end;
$$;

create or replace function public.handle_waitlist_booking_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'cancelled' then
    perform public.notify_next_waitlist_customer(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists waitlist_notify_after_booking_cancelled on public.bookings;
create trigger waitlist_notify_after_booking_cancelled
  after update of status on public.bookings
  for each row execute function public.handle_waitlist_booking_cancelled();

grant execute on function public.seed_phase22_waitlist_templates(uuid) to authenticated;
grant execute on function public.create_waitlist_entry(uuid, text, text, text, uuid, uuid, uuid, uuid, text, date, time, time, text) to anon, authenticated;
grant execute on function public.convert_waitlist_to_booking(uuid) to authenticated;
revoke execute on function public.notify_next_waitlist_customer(uuid) from public, anon, authenticated;
