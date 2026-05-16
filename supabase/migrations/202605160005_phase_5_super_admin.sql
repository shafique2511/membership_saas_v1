-- Luxantara Members - Phase 5 Super Admin Panel
-- Platform settings, enhanced admin functions

create table public.platform_settings (
  id bigint primary key default 1,
  trial_days int not null default 14,
  currency text not null default 'MYR',
  default_timezone text not null default 'Asia/Kuala_Lumpur',
  allow_owner_registration boolean not null default true,
  require_module_access_checks boolean not null default true,
  track_usage_limits boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint platform_settings_single_row check (id = 1)
);

alter table public.platform_settings enable row level security;

create policy "platform_settings read super_admin"
  on public.platform_settings for select
  to authenticated
  using (public.is_super_admin(auth.uid()));

create policy "platform_settings write super_admin"
  on public.platform_settings for all
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

insert into public.platform_settings (id) values (1)
on conflict (id) do nothing;

create trigger set_platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

create or replace function public.create_business_with_subscription(
  target_name text,
  target_business_type text,
  target_email text default null,
  target_phone text default null,
  target_timezone text default 'Asia/Kuala_Lumpur',
  target_package_slug text default 'starter',
  skip_trial boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_business_id uuid;
  selected_package_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can create businesses' using errcode = 'P0001';
  end if;

  insert into public.businesses (name, business_type, email, phone, timezone, status)
  values (target_name, target_business_type, target_email, target_phone, target_timezone, 'active')
  returning id into created_business_id;

  insert into public.branches (business_id, name, email, is_main)
  values (created_business_id, 'Main Branch', target_email, true);

  select id into selected_package_id
  from public.packages
  where slug = target_package_slug
    and is_active = true
  limit 1;

  if selected_package_id is null then
    select id into selected_package_id
    from public.packages
    where slug = 'starter'
    limit 1;
  end if;

  if skip_trial then
    insert into public.business_subscriptions (business_id, package_id, status, billing_cycle, start_date, next_billing_date)
    values (created_business_id, selected_package_id, 'active', 'monthly', current_date, current_date + interval '1 month');
  else
    insert into public.business_subscriptions (business_id, package_id, status, billing_cycle, start_date, trial_ends_at)
    values (created_business_id, selected_package_id, 'trial', 'monthly', current_date, now() + interval '14 days');
  end if;

  insert into public.business_module_access (business_id, module_key, access_level, source, limit_config)
  select created_business_id, m.module_key, pm.access_level, 'package', pm.limit_config
  from public.packages p
  join public.package_modules pm on pm.package_id = p.id
  join public.modules m on m.id = pm.module_id
  where p.id = selected_package_id
    and pm.is_enabled = true;

  return created_business_id;
end;
$$;

grant execute on function public.create_business_with_subscription(text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.assign_package_modules(
  target_package_id uuid,
  target_module_key text,
  target_access_level text,
  target_limit_config jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_module_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can manage package modules' using errcode = 'P0001';
  end if;

  select id into target_module_id
  from public.modules
  where module_key = target_module_key
    and is_active = true;

  if target_module_id is null then
    raise exception 'Module not found or inactive' using errcode = 'P0001';
  end if;

  insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
  values (target_package_id, target_module_id, target_access_level, target_limit_config, true)
  on conflict (package_id, module_id)
  do update set
    access_level = excluded.access_level,
    limit_config = excluded.limit_config,
    is_enabled = true,
    created_at = now();
end;
$$;

grant execute on function public.assign_package_modules(uuid, text, text, jsonb) to authenticated;

create or replace function public.remove_package_module(
  target_package_id uuid,
  target_module_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_module_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can manage package modules' using errcode = 'P0001';
  end if;

  select id into target_module_id
  from public.modules
  where module_key = target_module_key;

  if target_module_id is not null then
    delete from public.package_modules
    where package_id = target_package_id
      and module_id = target_module_id;
  end if;
end;
$$;

grant execute on function public.remove_package_module(uuid, text) to authenticated;

create or replace function public.create_paid_addon(
  target_business_id uuid,
  target_module_key text,
  target_name text,
  target_access_level text,
  target_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_addon_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can create add-ons' using errcode = 'P0001';
  end if;

  insert into public.business_addons (business_id, module_key, name, access_level, price, status)
  values (target_business_id, target_module_key, target_name, target_access_level, target_price, 'active')
  returning id into created_addon_id;

  insert into public.business_module_access (business_id, module_key, access_level, source, is_enabled)
  values (target_business_id, target_module_key, target_access_level, 'addon', true)
  on conflict (business_id, module_key, source)
  do update set
    access_level = excluded.access_level,
    is_enabled = true,
    end_date = null;

  return created_addon_id;
end;
$$;

grant execute on function public.create_paid_addon(uuid, text, text, text, numeric) to authenticated;

create or replace function public.create_billing_invoice(
  target_business_id uuid,
  target_amount numeric,
  target_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number text;
  created_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can create invoices' using errcode = 'P0001';
  end if;

  next_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.billing_invoices_id_seq'::regclass)::text, 4, '0');

  insert into public.billing_invoices (business_id, invoice_number, amount, status, due_date)
  values (target_business_id, next_number, target_amount, 'issued', coalesce(target_due_date, current_date + interval '30 days'))
  returning id into created_id;

  return created_id;
end;
$$;

grant execute on function public.create_billing_invoice(uuid, numeric, date) to authenticated;
