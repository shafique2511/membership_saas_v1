-- Luxantara Members - Phase 20: Settings Module
-- Booking rules, membership settings, and settings RPCs

create table if not exists public.booking_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade unique,
  slot_duration_minutes int not null default 60,
  buffer_time_minutes int not null default 0,
  min_booking_notice_hours int not null default 1,
  max_advance_days int not null default 30,
  auto_confirm boolean not null default false,
  deposit_required boolean not null default false,
  deposit_percentage numeric(5,2) not null default 0 check (deposit_percentage >= 0 and deposit_percentage <= 100),
  cancellation_policy text not null default 'free' check (cancellation_policy in ('free', 'fee', 'strict', 'none')),
  cancellation_fee_amount numeric(12,2) not null default 0 check (cancellation_fee_amount >= 0),
  allow_walk_in boolean not null default true,
  max_guests_per_booking int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade unique,
  auto_expiry boolean not null default true,
  reminder_days_before int[] not null default '{7,3,1}',
  allow_freeze boolean not null default true,
  max_freeze_days int not null default 30,
  freeze_cooldown_days int not null default 90,
  allow_transfer boolean not null default false,
  transfer_fee numeric(12,2) not null default 0 check (transfer_fee >= 0),
  default_renewal_behavior text not null default 'manual' check (default_renewal_behavior in ('manual', 'auto', 'reminder')),
  pro_rated_renewal boolean not null default false,
  grace_period_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('manager', 'staff')),
  permission_key text not null,
  is_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, role, permission_key)
);

create index booking_rules_business_id_idx on public.booking_rules(business_id);
create index membership_settings_business_id_idx on public.membership_settings(business_id);
create index staff_permissions_business_id_idx on public.staff_permissions(business_id);

alter table public.booking_rules enable row level security;
alter table public.membership_settings enable row level security;
alter table public.staff_permissions enable row level security;

create policy "booking_rules tenant all" on public.booking_rules for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy "membership_settings tenant all" on public.membership_settings for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy "staff_permissions tenant all" on public.staff_permissions for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create trigger set_booking_rules_updated_at before update on public.booking_rules
  for each row execute function public.set_updated_at();
create trigger set_membership_settings_updated_at before update on public.membership_settings
  for each row execute function public.set_updated_at();
create trigger set_staff_permissions_updated_at before update on public.staff_permissions
  for each row execute function public.set_updated_at();

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
  p_max_guests_per_booking int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
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
    updated_at = now()
  where business_id = p_business_id
  returning to_jsonb(booking_rules.*) into v_result;

  return v_result;
end;
$$;

create or replace function public.upsert_membership_settings(
  p_business_id uuid,
  p_auto_expiry boolean default null,
  p_reminder_days_before int[] default null,
  p_allow_freeze boolean default null,
  p_max_freeze_days int default null,
  p_freeze_cooldown_days int default null,
  p_allow_transfer boolean default null,
  p_transfer_fee numeric default null,
  p_default_renewal_behavior text default null,
  p_pro_rated_renewal boolean default null,
  p_grace_period_days int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  insert into public.membership_settings (business_id) values (p_business_id)
  on conflict (business_id) do nothing;

  update public.membership_settings set
    auto_expiry = coalesce(p_auto_expiry, membership_settings.auto_expiry),
    reminder_days_before = coalesce(p_reminder_days_before, membership_settings.reminder_days_before),
    allow_freeze = coalesce(p_allow_freeze, membership_settings.allow_freeze),
    max_freeze_days = coalesce(p_max_freeze_days, membership_settings.max_freeze_days),
    freeze_cooldown_days = coalesce(p_freeze_cooldown_days, membership_settings.freeze_cooldown_days),
    allow_transfer = coalesce(p_allow_transfer, membership_settings.allow_transfer),
    transfer_fee = coalesce(p_transfer_fee, membership_settings.transfer_fee),
    default_renewal_behavior = coalesce(p_default_renewal_behavior, membership_settings.default_renewal_behavior),
    pro_rated_renewal = coalesce(p_pro_rated_renewal, membership_settings.pro_rated_renewal),
    grace_period_days = coalesce(p_grace_period_days, membership_settings.grace_period_days),
    updated_at = now()
  where business_id = p_business_id
  returning to_jsonb(membership_settings.*) into v_result;

  return v_result;
end;
$$;

create or replace function public.get_booking_rules(p_business_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select to_jsonb(br.*)
  from public.booking_rules br
  where br.business_id = p_business_id
$$;

create or replace function public.get_membership_settings(p_business_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select to_jsonb(ms.*)
  from public.membership_settings ms
  where ms.business_id = p_business_id
$$;

create or replace function public.get_staff_permissions(p_business_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object('id', sp.id, 'role', sp.role, 'permission_key', sp.permission_key, 'is_granted', sp.is_granted)
    order by sp.role, sp.permission_key
  ), '[]'::jsonb)
  from public.staff_permissions sp
  where sp.business_id = p_business_id
$$;

create or replace function public.set_staff_permission(
  p_business_id uuid,
  p_role text,
  p_permission_key text,
  p_is_granted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.staff_permissions (business_id, role, permission_key, is_granted)
  values (p_business_id, p_role, p_permission_key, p_is_granted)
  on conflict (business_id, role, permission_key) do update set
    is_granted = p_is_granted,
    updated_at = now();
end;
$$;
