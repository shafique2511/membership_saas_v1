-- Luxantara Members - Phase 14: Notification Module

-- 1. Notification templates
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  notification_type text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'telegram', 'sms', 'in_app')),
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, notification_type, channel)
);

-- 2. Channel settings
create table if not exists public.channel_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'telegram', 'sms')),
  config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, channel)
);

-- 3. Enhance notifications table
alter table public.notifications add column if not exists template_id uuid references public.notification_templates(id) on delete set null;
alter table public.notifications add column if not exists error_message text;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists recipient text;

-- 4. Notification schedules (reminders, scheduled sends)
create table if not exists public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  notification_type text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'telegram', 'sms', 'in_app')),
  template_id uuid references public.notification_templates(id) on delete set null,
  reference_type text check (reference_type in ('booking', 'membership', 'customer')),
  reference_id uuid,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- 5. Notification broadcasts (promo/send-to-all)
create table if not exists public.notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'telegram', 'sms', 'in_app')),
  template_id uuid references public.notification_templates(id) on delete set null,
  subject text,
  body text not null,
  audience_filter jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  total_recipients integer not null default 0,
  success_count integer not null default 0,
  fail_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Indexes
create index if not exists notification_templates_business_id_idx on public.notification_templates(business_id);
create index if not exists notification_templates_type_channel_idx on public.notification_templates(notification_type, channel);
create index if not exists channel_settings_business_id_idx on public.channel_settings(business_id);
create index if not exists notification_schedules_business_id_idx on public.notification_schedules(business_id);
create index if not exists notification_schedules_scheduled_at_idx on public.notification_schedules(scheduled_at);
create index if not exists notification_schedules_reference_idx on public.notification_schedules(reference_type, reference_id);
create index if not exists notification_broadcasts_business_id_idx on public.notification_broadcasts(business_id);
create index if not exists notifications_template_id_idx on public.notifications(template_id);
create index if not exists notifications_channel_idx on public.notifications(channel);
create index if not exists notifications_type_idx on public.notifications(notification_type);

-- 7. RLS
alter table public.notification_templates enable row level security;
alter table public.channel_settings enable row level security;
alter table public.notification_schedules enable row level security;
alter table public.notification_broadcasts enable row level security;

create policy "notification templates tenant all" on public.notification_templates
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  );

create policy "channel settings tenant all" on public.channel_settings
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  );

create policy "notification schedules tenant all" on public.notification_schedules
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  );

create policy "notification broadcasts tenant all" on public.notification_broadcasts
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
  );

-- 8. Seed default templates
create or replace function public.seed_default_templates(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_templates (business_id, notification_type, channel, subject, body, variables, is_default) values
  -- Booking confirmation
  (p_business_id, 'booking_confirmation', 'whatsapp', null,
    'Hi {customer_name}, your booking at {business_name} is confirmed on {booking_date} at {booking_time}. Service: {service_name}. Staff: {staff_name}.',
    '["customer_name","business_name","booking_date","booking_time","service_name","staff_name"]'::jsonb, true),
  (p_business_id, 'booking_confirmation', 'email',
    'Booking Confirmed - {business_name}',
    'Dear {customer_name},<br><br>Your booking at {business_name} is confirmed.<br><br>Date: {booking_date}<br>Time: {booking_time}<br>Service: {service_name}<br>Staff: {staff_name}<br><br>Thank you.',
    '["customer_name","business_name","booking_date","booking_time","service_name","staff_name"]'::jsonb, true),
  (p_business_id, 'booking_confirmation', 'telegram', null,
    '✅ Booking Confirmed! {booking_date} at {booking_time} - {service_name} with {staff_name}',
    '["customer_name","business_name","booking_date","booking_time","service_name","staff_name"]'::jsonb, true),
  (p_business_id, 'booking_confirmation', 'in_app', null,
    'Your booking at {business_name} on {booking_date} at {booking_time} is confirmed.',
    '["customer_name","business_name","booking_date","booking_time","service_name","staff_name"]'::jsonb, true),

  -- Booking reminder
  (p_business_id, 'booking_reminder', 'whatsapp', null,
    'Reminder: You have a booking at {business_name} tomorrow ({booking_date}) at {booking_time}. Service: {service_name}.',
    '["customer_name","business_name","booking_date","booking_time","service_name"]'::jsonb, true),
  (p_business_id, 'booking_reminder', 'email',
    'Reminder: Booking Tomorrow at {business_name}',
    'Dear {customer_name},<br><br>This is a reminder for your booking tomorrow:<br><br>Date: {booking_date}<br>Time: {booking_time}<br>Service: {service_name}<br><br>See you soon!',
    '["customer_name","business_name","booking_date","booking_time","service_name"]'::jsonb, true),
  (p_business_id, 'booking_reminder', 'telegram', null,
    '⏰ Reminder: {booking_date} at {booking_time} - {service_name}',
    '["customer_name","business_name","booking_date","booking_time","service_name"]'::jsonb, true),
  (p_business_id, 'booking_reminder', 'in_app', null,
    'Reminder: Your booking at {business_name} is tomorrow at {booking_time}.',
    '["customer_name","business_name","booking_date","booking_time","service_name"]'::jsonb, true),

  -- Booking cancellation
  (p_business_id, 'booking_cancellation', 'whatsapp', null,
    'Hi {customer_name}, your booking at {business_name} on {booking_date} at {booking_time} has been cancelled.',
    '["customer_name","business_name","booking_date","booking_time"]'::jsonb, true),
  (p_business_id, 'booking_cancellation', 'email',
    'Booking Cancelled - {business_name}',
    'Dear {customer_name},<br><br>Your booking at {business_name} on {booking_date} at {booking_time} has been cancelled.<br><br>If you have any questions, please contact us.',
    '["customer_name","business_name","booking_date","booking_time"]'::jsonb, true),
  (p_business_id, 'booking_cancellation', 'in_app', null,
    'Your booking at {business_name} on {booking_date} has been cancelled.',
    '["customer_name","business_name","booking_date","booking_time"]'::jsonb, true),

  -- Booking reschedule
  (p_business_id, 'booking_reschedule', 'whatsapp', null,
    'Hi {customer_name}, your booking has been rescheduled to {booking_date} at {booking_time}. Service: {service_name}.',
    '["customer_name","business_name","booking_date","booking_time","service_name"]'::jsonb, true),
  (p_business_id, 'booking_reschedule', 'email',
    'Booking Rescheduled - {business_name}',
    'Dear {customer_name},<br><br>Your booking has been rescheduled.<br><br>New Date: {booking_date}<br>New Time: {booking_time}<br>Service: {service_name}<br><br>Thank you.',
    '["customer_name","business_name","booking_date","booking_time","service_name"]'::jsonb, true),
  (p_business_id, 'booking_reschedule', 'in_app', null,
    'Your booking has been rescheduled to {booking_date} at {booking_time}.',
    '["customer_name","business_name","booking_date","booking_time"]'::jsonb, true),

  -- Payment confirmation
  (p_business_id, 'payment_confirmation', 'whatsapp', null,
    'Payment confirmed! Amount: {amount}. Reference: {payment_status}. Thank you for your payment at {business_name}.',
    '["customer_name","business_name","amount","payment_status"]'::jsonb, true),
  (p_business_id, 'payment_confirmation', 'email',
    'Payment Confirmed - {business_name}',
    'Dear {customer_name},<br><br>Your payment of {amount} has been confirmed.<br><br>Status: {payment_status}<br><br>Thank you for your business.',
    '["customer_name","business_name","amount","payment_status"]'::jsonb, true),
  (p_business_id, 'payment_confirmation', 'in_app', null,
    'Payment of {amount} confirmed. Thank you!',
    '["customer_name","amount","payment_status"]'::jsonb, true),

  -- Membership expiry
  (p_business_id, 'membership_expiry', 'whatsapp', null,
    'Hi {customer_name}, your {membership_name} membership at {business_name} will expire on {expiry_date}. Renew now to keep enjoying your benefits!',
    '["customer_name","business_name","membership_name","expiry_date"]'::jsonb, true),
  (p_business_id, 'membership_expiry', 'email',
    'Membership Expiring Soon - {business_name}',
    'Dear {customer_name},<br><br>Your {membership_name} membership will expire on {expiry_date}.<br><br>Renew now to continue enjoying your benefits at {business_name}.',
    '["customer_name","business_name","membership_name","expiry_date"]'::jsonb, true),
  (p_business_id, 'membership_expiry', 'telegram', null,
    '⚠️ Your {membership_name} membership expires on {expiry_date}. Renew now!',
    '["customer_name","business_name","membership_name","expiry_date"]'::jsonb, true),
  (p_business_id, 'membership_expiry', 'in_app', null,
    'Your {membership_name} membership expires on {expiry_date}.',
    '["customer_name","membership_name","expiry_date"]'::jsonb, true),

  -- Membership renewal
  (p_business_id, 'membership_renewal', 'whatsapp', null,
    'Great news! Your {membership_name} membership at {business_name} has been renewed successfully.',
    '["customer_name","business_name","membership_name"]'::jsonb, true),
  (p_business_id, 'membership_renewal', 'email',
    'Membership Renewed - {business_name}',
    'Dear {customer_name},<br><br>Your {membership_name} membership has been renewed successfully.<br><br>Thank you for being a valued member at {business_name}.',
    '["customer_name","business_name","membership_name"]'::jsonb, true),
  (p_business_id, 'membership_renewal', 'in_app', null,
    'Your {membership_name} membership has been renewed.',
    '["customer_name","membership_name"]'::jsonb, true),

  -- Birthday message
  (p_business_id, 'birthday_message', 'whatsapp', null,
    'Happy Birthday {customer_name}! 🎂 Enjoy a special treat from {business_name} on your special day.',
    '["customer_name","business_name"]'::jsonb, true),
  (p_business_id, 'birthday_message', 'email',
    'Happy Birthday from {business_name}!',
    'Dear {customer_name},<br><br>Happy Birthday! 🎂<br><br>Come visit {business_name} and enjoy a special birthday treat.',
    '["customer_name","business_name"]'::jsonb, true),
  (p_business_id, 'birthday_message', 'telegram', null,
    '🎂 Happy Birthday {customer_name}! Come celebrate at {business_name}!',
    '["customer_name","business_name"]'::jsonb, true),
  (p_business_id, 'birthday_message', 'in_app', null,
    'Happy Birthday! 🎂 Enjoy a special treat from us.',
    '["customer_name"]'::jsonb, true),

  -- No-show warning
  (p_business_id, 'no_show_warning', 'whatsapp', null,
    'Hi {customer_name}, you missed your booking at {business_name} on {booking_date} at {booking_time}. Please contact us to reschedule.',
    '["customer_name","business_name","booking_date","booking_time"]'::jsonb, true),
  (p_business_id, 'no_show_warning', 'email',
    'Missed Appointment - {business_name}',
    'Dear {customer_name},<br><br>You missed your appointment at {business_name} on {booking_date} at {booking_time}.<br><br>Please contact us to reschedule.',
    '["customer_name","business_name","booking_date","booking_time"]'::jsonb, true),
  (p_business_id, 'no_show_warning', 'in_app', null,
    'You missed your booking on {booking_date} at {booking_time}. Please reschedule.',
    '["customer_name","booking_date","booking_time"]'::jsonb, true),

  -- Promo broadcast
  (p_business_id, 'promo_broadcast', 'whatsapp', null,
    'Hi {customer_name}, check out our latest promotion at {business_name}! Visit us today.',
    '["customer_name","business_name"]'::jsonb, true),
  (p_business_id, 'promo_broadcast', 'email',
    'Special Promotion - {business_name}',
    'Dear {customer_name},<br><br>Check out our latest promotion at {business_name}!<br><br>Visit us today to enjoy exclusive offers.',
    '["customer_name","business_name"]'::jsonb, true),
  (p_business_id, 'promo_broadcast', 'telegram', null,
    '🎉 Special promotion at {business_name}! Check it out!',
    '["customer_name","business_name"]'::jsonb, true),
  (p_business_id, 'promo_broadcast', 'in_app', null,
    'Check out our latest promotion!',
    '["customer_name"]'::jsonb, true)

  on conflict (business_id, notification_type, channel) do nothing;
end;
$$;
