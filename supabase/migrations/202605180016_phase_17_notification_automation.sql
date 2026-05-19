-- Phase 17: notification automation and WhatsApp-first delivery logs
-- Additive migration. No existing notification data is deleted or reset.

alter table public.notifications
  add column if not exists action_url text,
  add column if not exists delivery_provider text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists attempted_at timestamptz;

create index if not exists notifications_business_type_status_idx on public.notifications(business_id, notification_type, status, created_at desc);
create index if not exists notifications_action_url_idx on public.notifications(action_url) where action_url is not null;

alter table public.notification_schedules
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists notification_schedules_pending_due_idx
  on public.notification_schedules(business_id, scheduled_at)
  where status = 'pending';

create or replace function public.simple_url_encode(target_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(coalesce(target_text, ''), '%', '%25'),
          E'\n', '%0A'
        ),
        ' ', '%20'
      ),
      '&', '%26'
    ),
    '#', '%23'
  )
$$;

create or replace function public.render_notification_template_sql(target_template text, target_variables jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_result text := coalesce(target_template, '');
  v_key text;
  v_value text;
begin
  for v_key, v_value in select key, value from jsonb_each_text(coalesce(target_variables, '{}'::jsonb)) loop
    v_result := replace(v_result, '{' || v_key || '}', coalesce(v_value, ''));
  end loop;

  return v_result;
end;
$$;

create or replace function public.build_whatsapp_link(target_phone text, target_message text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when regexp_replace(coalesce(target_phone, ''), '[^0-9]', '', 'g') = '' then null
    else 'https://wa.me/' || regexp_replace(coalesce(target_phone, ''), '[^0-9]', '', 'g') || '?text=' || public.simple_url_encode(target_message)
  end
$$;

create or replace function public.seed_phase17_notification_templates(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_business_access(p_business_id) and not public.is_super_admin(auth.uid()) then
    raise exception 'Not allowed to seed notification templates' using errcode = 'P0001';
  end if;

  insert into public.notification_templates (business_id, notification_type, channel, subject, body, variables, is_default, is_active)
  values
    (p_business_id, 'receipt_message', 'whatsapp', null,
      'Hi {customer_name}, your receipt from {business_name} is ready. Amount: {amount}. Payment status: {payment_status}.',
      '["customer_name","business_name","amount","payment_status"]'::jsonb, true, true),
    (p_business_id, 'receipt_message', 'email',
      'Receipt from {business_name}',
      'Dear {customer_name}, your receipt from {business_name} is ready. Amount: {amount}. Payment status: {payment_status}.',
      '["customer_name","business_name","amount","payment_status"]'::jsonb, true, true),
    (p_business_id, 'receipt_message', 'telegram', null,
      'Receipt ready from {business_name}. Amount: {amount}.',
      '["customer_name","business_name","amount","payment_status"]'::jsonb, true, true),
    (p_business_id, 'receipt_message', 'sms', null,
      'Receipt from {business_name}: {amount}, {payment_status}.',
      '["business_name","amount","payment_status"]'::jsonb, true, true),
    (p_business_id, 'receipt_message', 'in_app', null,
      'Your receipt from {business_name} is ready. Amount: {amount}.',
      '["customer_name","business_name","amount","payment_status"]'::jsonb, true, true),
    (p_business_id, 'promo_broadcast', 'sms', null,
      'Promo from {business_name}: visit us today for the latest offer.',
      '["customer_name","business_name"]'::jsonb, true, true),
    (p_business_id, 'booking_confirmation', 'sms', null,
      'Booking confirmed at {business_name}: {booking_date} {booking_time}, {service_name}.',
      '["business_name","booking_date","booking_time","service_name"]'::jsonb, true, true),
    (p_business_id, 'payment_confirmation', 'sms', null,
      'Payment confirmed at {business_name}. Amount: {amount}. Status: {payment_status}.',
      '["business_name","amount","payment_status"]'::jsonb, true, true)
  on conflict (business_id, notification_type, channel) do update set
    subject = excluded.subject,
    body = excluded.body,
    variables = excluded.variables,
    is_default = true,
    is_active = true,
    updated_at = now();
end;
$$;

create or replace function public.log_templated_notification_attempt(
  p_business_id uuid,
  p_customer_id uuid,
  p_notification_type text,
  p_channel text default 'whatsapp',
  p_recipient text default null,
  p_variables jsonb default '{}'::jsonb,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template public.notification_templates%rowtype;
  v_title text;
  v_message text;
  v_action_url text;
  v_notification_id uuid;
begin
  if not public.business_has_module_access(p_business_id, 'notification') then
    return null;
  end if;

  select *
  into v_template
  from public.notification_templates
  where business_id = p_business_id
    and notification_type = p_notification_type
    and channel = p_channel
    and is_active = true
  limit 1;

  if not found then
    v_title := replace(p_notification_type, '_', ' ');
    v_message := v_title;
  else
    v_title := coalesce(public.render_notification_template_sql(v_template.subject, p_variables), replace(p_notification_type, '_', ' '));
    v_message := public.render_notification_template_sql(v_template.body, p_variables);
  end if;

  if p_channel = 'whatsapp' then
    v_action_url := public.build_whatsapp_link(p_recipient, v_message);
  end if;

  insert into public.notifications (
    business_id,
    customer_id,
    channel,
    notification_type,
    title,
    message,
    status,
    template_id,
    recipient,
    action_url,
    delivery_provider,
    metadata,
    attempted_at
  )
  values (
    p_business_id,
    p_customer_id,
    p_channel,
    p_notification_type,
    v_title,
    v_message,
    case when p_channel = 'whatsapp' then 'queued' else 'queued' end,
    v_template.id,
    p_recipient,
    v_action_url,
    case when p_channel = 'whatsapp' then 'wa_link' else 'mock' end,
    jsonb_build_object(
      'reference_type', p_reference_type,
      'reference_id', p_reference_id,
      'variables', coalesce(p_variables, '{}'::jsonb),
      'whatsapp_first', p_channel = 'whatsapp'
    ),
    now()
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.booking_notification_variables(p_booking public.bookings)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_customer public.customers%rowtype;
  v_service public.services%rowtype;
  v_staff public.staff%rowtype;
begin
  select * into v_business from public.businesses where id = p_booking.business_id;
  select * into v_customer from public.customers where id = p_booking.customer_id;
  select * into v_service from public.services where id = p_booking.service_id;
  select * into v_staff from public.staff where id = p_booking.staff_id;

  return jsonb_build_object(
    'customer_name', coalesce(v_customer.full_name, 'Customer'),
    'business_name', coalesce(v_business.name, 'Our business'),
    'booking_date', coalesce(p_booking.booking_date::text, ''),
    'booking_time', coalesce(left(p_booking.start_time::text, 5), ''),
    'service_name', coalesce(v_service.name, 'Service'),
    'staff_name', coalesce(v_staff.full_name, 'Staff')
  );
end;
$$;

create or replace function public.handle_booking_notification_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_type text;
  v_scheduled_at timestamptz;
begin
  if not public.business_has_module_access(new.business_id, 'notification') then
    return new;
  end if;

  select * into v_customer from public.customers where id = new.customer_id;

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    v_type := 'booking_confirmation';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'confirmed' then
    v_type := 'booking_confirmation';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'cancelled' then
    v_type := 'booking_cancellation';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'no_show' then
    v_type := 'no_show_warning';
  elsif tg_op = 'UPDATE' and new.status = 'confirmed' and (old.booking_date is distinct from new.booking_date or old.start_time is distinct from new.start_time) then
    v_type := 'booking_reschedule';
  end if;

  if v_type is not null then
    perform public.log_templated_notification_attempt(
      new.business_id,
      new.customer_id,
      v_type,
      'whatsapp',
      v_customer.phone,
      public.booking_notification_variables(new),
      'booking',
      new.id
    );
  end if;

  if new.status = 'confirmed' then
    v_scheduled_at := (new.booking_date + new.start_time) - interval '1 day';
    if v_scheduled_at > now()
      and not exists (
        select 1 from public.notification_schedules
        where business_id = new.business_id
          and notification_type = 'booking_reminder'
          and reference_type = 'booking'
          and reference_id = new.id
          and status <> 'cancelled'
      )
    then
      insert into public.notification_schedules (
        business_id,
        notification_type,
        channel,
        reference_type,
        reference_id,
        scheduled_at,
        status,
        metadata
      )
      values (
        new.business_id,
        'booking_reminder',
        'whatsapp',
        'booking',
        new.id,
        v_scheduled_at,
        'pending',
        public.booking_notification_variables(new)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_notification_automation_after_write on public.bookings;
create trigger booking_notification_automation_after_write
  after insert or update of status, booking_date, start_time on public.bookings
  for each row execute function public.handle_booking_notification_automation();

create or replace function public.handle_payment_notification_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_customer public.customers%rowtype;
begin
  if not public.business_has_module_access(new.business_id, 'notification') then
    return new;
  end if;

  if new.status not in ('paid', 'verified') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  select * into v_business from public.businesses where id = new.business_id;
  select * into v_customer from public.customers where id = new.customer_id;

  perform public.log_templated_notification_attempt(
    new.business_id,
    new.customer_id,
    'payment_confirmation',
    'whatsapp',
    v_customer.phone,
    jsonb_build_object(
      'customer_name', coalesce(v_customer.full_name, 'Customer'),
      'business_name', coalesce(v_business.name, 'Our business'),
      'amount', coalesce(new.amount::text, ''),
      'payment_status', new.status
    ),
    new.reference_type,
    new.reference_id
  );

  return new;
end;
$$;

drop trigger if exists payment_notification_automation_after_write on public.payments;
create trigger payment_notification_automation_after_write
  after insert or update of status on public.payments
  for each row execute function public.handle_payment_notification_automation();

create or replace function public.handle_membership_notification_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_customer public.customers%rowtype;
  v_plan public.membership_plans%rowtype;
  v_scheduled_at timestamptz;
begin
  if not public.business_has_module_access(new.business_id, 'notification') then
    return new;
  end if;

  select * into v_business from public.businesses where id = new.business_id;
  select * into v_customer from public.customers where id = new.customer_id;
  select * into v_plan from public.membership_plans where id = new.plan_id;

  if tg_op = 'UPDATE' and new.status = 'active' and old.end_date is not null and new.end_date > old.end_date then
    perform public.log_templated_notification_attempt(
      new.business_id,
      new.customer_id,
      'membership_renewal',
      'whatsapp',
      v_customer.phone,
      jsonb_build_object(
        'customer_name', coalesce(v_customer.full_name, 'Customer'),
        'business_name', coalesce(v_business.name, 'Our business'),
        'membership_name', coalesce(v_plan.name, 'Membership'),
        'expiry_date', coalesce(new.end_date::text, '')
      ),
      'membership',
      new.id
    );
  end if;

  if new.status = 'active' then
    v_scheduled_at := (new.end_date::timestamp - interval '7 days');
    if v_scheduled_at > now()
      and not exists (
        select 1 from public.notification_schedules
        where business_id = new.business_id
          and notification_type = 'membership_expiry'
          and reference_type = 'membership'
          and reference_id = new.id
          and status <> 'cancelled'
      )
    then
      insert into public.notification_schedules (
        business_id,
        notification_type,
        channel,
        reference_type,
        reference_id,
        scheduled_at,
        status,
        metadata
      )
      values (
        new.business_id,
        'membership_expiry',
        'whatsapp',
        'membership',
        new.id,
        v_scheduled_at,
        'pending',
        jsonb_build_object(
          'customer_name', coalesce(v_customer.full_name, 'Customer'),
          'business_name', coalesce(v_business.name, 'Our business'),
          'membership_name', coalesce(v_plan.name, 'Membership'),
          'expiry_date', coalesce(new.end_date::text, '')
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists membership_notification_automation_after_write on public.memberships;
create trigger membership_notification_automation_after_write
  after insert or update of status, end_date on public.memberships
  for each row execute function public.handle_membership_notification_automation();

create or replace function public.enforce_notification_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.business_has_module_access(new.business_id, 'notification') then
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

grant execute on function public.seed_phase17_notification_templates(uuid) to authenticated;
revoke execute on function public.log_templated_notification_attempt(uuid, uuid, text, text, text, jsonb, text, uuid) from public, anon, authenticated;
