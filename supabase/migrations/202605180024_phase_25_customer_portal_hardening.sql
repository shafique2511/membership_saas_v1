create or replace function public.get_current_customer_id(p_business_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select c.id
  from public.customers c
  where c.business_id = p_business_id
    and c.user_id = auth.uid()
    and c.status = 'active'
  order by c.created_at desc
  limit 1
$$;

create or replace function public.get_customer_bookings(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.customer_owns_record(p_customer_id) and not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and public.has_business_access(c.business_id)
  ) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'booking_type', b.booking_type,
        'booking_date', b.booking_date,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'status', b.status,
        'total_amount', b.total_amount,
        'deposit_amount', b.deposit_amount,
        'payment_status', b.payment_status,
        'notes', b.notes,
        'cancellation_deadline_at', b.cancellation_deadline_at,
        'created_at', b.created_at,
        'service_id', b.service_id,
        'staff_id', b.staff_id,
        'resource_id', b.resource_id,
        'service_name', s.name,
        'staff_name', st.full_name,
        'branch_name', br.name
      )
      order by b.booking_date desc, b.start_time desc
    ), '[]'::jsonb)
    from public.bookings b
    left join public.services s on s.id = b.service_id
    left join public.staff st on st.id = b.staff_id
    left join public.branches br on br.id = b.branch_id
    where b.customer_id = p_customer_id
  );
end;
$$;

create or replace function public.get_customer_payments(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.customer_owns_record(p_customer_id) and not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and public.has_business_access(c.business_id)
  ) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'payment_method', p.payment_method,
        'amount', p.amount,
        'status', p.status,
        'reference_type', p.reference_type,
        'reference_id', p.reference_id,
        'transaction_id', p.transaction_id,
        'paid_at', p.paid_at,
        'created_at', p.created_at,
        'business_name', b.name,
        'customer_name', c.full_name
      )
      order by p.created_at desc
    ), '[]'::jsonb)
    from public.payments p
    join public.customers c on c.id = p.customer_id
    join public.businesses b on b.id = p.business_id
    where p.customer_id = p_customer_id
  );
end;
$$;

create or replace function public.customer_cancel_booking(
  p_booking_id uuid,
  p_reason text default 'Cancelled by customer'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null or not public.customer_owns_record(v_booking.customer_id) then
    raise exception 'Booking not found' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed bookings can be cancelled' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'cancelled',
      notes = concat_ws(' | ', notes, nullif(trim(p_reason), '')),
      updated_at = now()
  where id = p_booking_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, new_data)
  values (
    v_booking.business_id,
    auth.uid(),
    'customer.booking.cancel',
    'bookings',
    p_booking_id,
    jsonb_build_object('reason', p_reason)
  );

  return p_booking_id;
end;
$$;

create or replace function public.customer_reschedule_booking(
  p_booking_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_staff_id uuid default null,
  p_resource_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.id is null or not public.customer_owns_record(v_booking.customer_id) then
    raise exception 'Booking not found' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'Only pending or confirmed bookings can be rescheduled' using errcode = 'P0001';
  end if;

  if p_booking_date < current_date then
    raise exception 'Booking date cannot be in the past' using errcode = 'P0001';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'End time must be after start time' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.business_id = v_booking.business_id
      and b.id <> p_booking_id
      and b.booking_date = p_booking_date
      and b.status not in ('cancelled', 'no_show')
      and tsrange((p_booking_date + p_start_time), (p_booking_date + p_end_time), '[)')
        && tsrange((b.booking_date + b.start_time), (b.booking_date + b.end_time), '[)')
      and (
        (coalesce(p_staff_id, v_booking.staff_id) is not null and b.staff_id = coalesce(p_staff_id, v_booking.staff_id))
        or (coalesce(p_resource_id, v_booking.resource_id) is not null and b.resource_id = coalesce(p_resource_id, v_booking.resource_id))
      )
  ) then
    raise exception 'Selected slot is no longer available' using errcode = 'P0001';
  end if;

  update public.bookings
  set booking_date = p_booking_date,
      start_time = p_start_time,
      end_time = p_end_time,
      staff_id = coalesce(p_staff_id, staff_id),
      resource_id = coalesce(p_resource_id, resource_id),
      status = 'pending',
      notes = concat_ws(' | ', notes, 'Rescheduled by customer'),
      updated_at = now()
  where id = p_booking_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, new_data)
  values (
    v_booking.business_id,
    auth.uid(),
    'customer.booking.reschedule',
    'bookings',
    p_booking_id,
    jsonb_build_object('booking_date', p_booking_date, 'start_time', p_start_time, 'end_time', p_end_time)
  );

  return p_booking_id;
end;
$$;

create or replace function public.customer_buy_membership(
  p_plan_id uuid,
  p_payment_method text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.membership_plans%rowtype;
  v_customer_id uuid;
  v_membership_id uuid;
begin
  select * into v_plan
  from public.membership_plans
  where id = p_plan_id
    and is_active = true;

  if v_plan.id is null then
    raise exception 'Membership plan is not available' using errcode = 'P0001';
  end if;

  v_customer_id := public.get_current_customer_id(v_plan.business_id);
  if v_customer_id is null then
    raise exception 'Customer profile not found' using errcode = 'P0001';
  end if;

  v_membership_id := public.assign_membership(
    v_plan.business_id,
    v_customer_id,
    p_plan_id,
    current_date,
    coalesce(nullif(trim(p_payment_method), ''), 'manual'),
    0
  );

  insert into public.payments (
    business_id,
    customer_id,
    reference_type,
    reference_id,
    payment_method,
    amount,
    status
  )
  values (
    v_plan.business_id,
    v_customer_id,
    'membership',
    v_membership_id,
    coalesce(nullif(trim(p_payment_method), ''), 'manual'),
    v_plan.price,
    'pending'
  );

  return v_membership_id;
end;
$$;

create or replace function public.customer_redeem_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.rewards%rowtype;
  v_customer_id uuid;
begin
  select * into v_reward
  from public.rewards
  where id = p_reward_id
    and is_active = true;

  if v_reward.id is null then
    raise exception 'Reward is not available' using errcode = 'P0001';
  end if;

  v_customer_id := public.get_current_customer_id(v_reward.business_id);
  if v_customer_id is null then
    raise exception 'Customer profile not found' using errcode = 'P0001';
  end if;

  perform public.redeem_loyalty_points(
    v_reward.business_id,
    v_customer_id,
    v_reward.points_required,
    p_reward_id,
    'reward',
    p_reward_id
  );
end;
$$;

grant execute on function public.get_current_customer_id(uuid) to authenticated;
grant execute on function public.get_customer_bookings(uuid) to authenticated;
grant execute on function public.get_customer_payments(uuid) to authenticated;
grant execute on function public.customer_cancel_booking(uuid, text) to authenticated;
grant execute on function public.customer_reschedule_booking(uuid, date, time, time, uuid, uuid) to authenticated;
grant execute on function public.customer_buy_membership(uuid, text) to authenticated;
grant execute on function public.customer_redeem_reward(uuid) to authenticated;
