-- Phase 5 package/module matrix completion.
-- Adds AI Assistant, normalizes package entitlements, keeps Data Ownership enabled for all packages.

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.modules'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%module_key%';

  if v_constraint_name is not null then
    execute format('alter table public.modules drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.modules
  add constraint modules_module_key_check check (module_key in (
    'core', 'booking', 'membership', 'loyalty', 'pos', 'inventory', 'staff_commission',
    'payment', 'notification', 'reports', 'marketing', 'multi_branch', 'customer_portal',
    'white_label', 'data_ownership_backup', 'ai_assistant'
  ));

insert into public.modules (module_key, module_name, description, category, is_core, is_active, sort_order)
values
  ('ai_assistant', 'AI Assistant', 'Enterprise AI assistant for operational help, automation guidance, summaries, and business insights.', 'automation', false, true, 100)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  description = excluded.description,
  category = excluded.category,
  is_core = excluded.is_core,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.packages (name, slug, description, monthly_price, yearly_price, setup_fee, is_active, sort_order)
values
  ('Starter', 'starter', 'Core booking, customer portal, and basic reporting for small teams.', 99, 990, 0, true, 10),
  ('Growth', 'growth', 'Membership, loyalty, payment, and higher booking limits for growing businesses.', 199, 1990, 0, true, 20),
  ('Pro', 'pro', 'POS, inventory, staff commission, notifications, and pro reports.', 399, 3990, 0, true, 30),
  ('Business Suite', 'business_suite', 'Advanced operations, marketing, multi-branch basics, and higher limits.', 699, 6990, 0, true, 40),
  ('Enterprise', 'enterprise', 'All modules, white label, AI assistant, custom limits, custom domain, and priority support.', 0, 0, 0, true, 50)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  setup_fee = excluded.setup_fee,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.upsert_package_module_rule(
  target_package_slug text,
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
  v_package_id uuid;
  v_module_id uuid;
begin
  select id into v_package_id from public.packages where slug = target_package_slug;
  select id into v_module_id from public.modules where module_key = target_module_key;

  if v_package_id is null or v_module_id is null then
    raise exception 'Package or module not found: %, %', target_package_slug, target_module_key;
  end if;

  insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
  values (v_package_id, v_module_id, target_access_level, target_limit_config, target_access_level <> 'none')
  on conflict (package_id, module_id) do update set
    access_level = excluded.access_level,
    limit_config = excluded.limit_config,
    is_enabled = excluded.is_enabled,
    updated_at = now();
end;
$$;

-- Disable AI Assistant for non-enterprise packages if rows already exist.
update public.package_modules pm
set access_level = 'none',
    is_enabled = false,
    updated_at = now()
from public.packages p, public.modules m
where pm.package_id = p.id
  and pm.module_id = m.id
  and m.module_key = 'ai_assistant'
  and p.slug <> 'enterprise';

-- Starter
select public.upsert_package_module_rule('starter', 'core', 'unlimited', '{"customers":300,"staff":2,"branches":1}'::jsonb);
select public.upsert_package_module_rule('starter', 'booking', 'basic', '{"bookings_per_month":100}'::jsonb);
select public.upsert_package_module_rule('starter', 'customer_portal', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('starter', 'reports', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('starter', 'data_ownership_backup', 'unlimited', '{}'::jsonb);

-- Growth
select public.upsert_package_module_rule('growth', 'core', 'unlimited', '{"customers":1000,"staff":5,"branches":1}'::jsonb);
select public.upsert_package_module_rule('growth', 'booking', 'pro', '{"bookings_per_month":300}'::jsonb);
select public.upsert_package_module_rule('growth', 'membership', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('growth', 'loyalty', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('growth', 'payment', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('growth', 'customer_portal', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('growth', 'reports', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('growth', 'data_ownership_backup', 'unlimited', '{}'::jsonb);

-- Pro
select public.upsert_package_module_rule('pro', 'core', 'unlimited', '{"customers":5000,"staff":15,"branches":2}'::jsonb);
select public.upsert_package_module_rule('pro', 'booking', 'pro', '{"bookings_per_month":1000}'::jsonb);
select public.upsert_package_module_rule('pro', 'membership', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'loyalty', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'pos', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'inventory', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'staff_commission', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'payment', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'notification', 'basic', '{"whatsapp_messages_per_month":500}'::jsonb);
select public.upsert_package_module_rule('pro', 'reports', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'customer_portal', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('pro', 'data_ownership_backup', 'unlimited', '{}'::jsonb);

-- Business Suite
select public.upsert_package_module_rule('business_suite', 'core', 'unlimited', '{"customers":20000,"staff":50,"branches":5}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'booking', 'advanced', '{"bookings_per_month":5000}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'membership', 'advanced', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'loyalty', 'advanced', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'pos', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'inventory', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'staff_commission', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'payment', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'notification', 'pro', '{"whatsapp_messages_per_month":2000}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'reports', 'advanced', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'marketing', 'pro', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'multi_branch', 'basic', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'customer_portal', 'advanced', '{}'::jsonb);
select public.upsert_package_module_rule('business_suite', 'data_ownership_backup', 'unlimited', '{}'::jsonb);

-- Enterprise
select public.upsert_package_module_rule('enterprise', 'core', 'unlimited', '{"customers":null,"staff":null,"branches":null,"custom_domain":true,"priority_support":true}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'booking', 'unlimited', '{"bookings_per_month":null}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'membership', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'loyalty', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'pos', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'inventory', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'staff_commission', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'payment', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'notification', 'unlimited', '{"whatsapp_messages_per_month":null}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'reports', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'marketing', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'multi_branch', 'advanced', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'customer_portal', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'white_label', 'unlimited', '{"custom_domain":true}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'data_ownership_backup', 'unlimited', '{}'::jsonb);
select public.upsert_package_module_rule('enterprise', 'ai_assistant', 'unlimited', '{}'::jsonb);

drop function if exists public.upsert_package_module_rule(text, text, text, jsonb);

create or replace function public.default_role_permission(target_role text, target_permission_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when target_role in ('super_admin', 'owner') then true
    when target_role = 'manager' then target_permission_key = any(array[
      'core.access',
      'customers.manage',
      'customers.view_basic',
      'customers.create',
      'customers.edit',
      'bookings.manage',
      'bookings.view',
      'bookings.create',
      'bookings.edit',
      'bookings.cancel',
      'bookings.check_in',
      'bookings.update_status',
      'bookings.create_walk_in',
      'memberships.manage',
      'memberships.view',
      'memberships.assign',
      'pos.access',
      'inventory.view',
      'inventory.adjust',
      'payments.process',
      'payments.view',
      'reports.manage',
      'reports.view',
      'loyalty.manage',
      'notifications.manage',
      'marketing.manage',
      'branches.manage'
    ])
    when target_role = 'staff' then target_permission_key = any(array[
      'core.access',
      'customers.view_basic',
      'bookings.view_assigned',
      'bookings.view',
      'bookings.update_status',
      'bookings.create_walk_in'
    ])
    when target_role = 'customer' then target_permission_key = any(array[
      'customer.profile.view',
      'customer.booking.create',
      'customer.membership.view',
      'customer.rewards.view',
      'customer.history.view'
    ])
    else false
  end
$$;

create or replace function public.module_permission_key(target_module_key text)
returns text
language sql
immutable
set search_path = public
as $$
  select case target_module_key
    when 'core' then 'core.access'
    when 'booking' then 'bookings.view'
    when 'membership' then 'memberships.view'
    when 'loyalty' then 'loyalty.manage'
    when 'pos' then 'pos.access'
    when 'inventory' then 'inventory.view'
    when 'staff_commission' then 'staff.manage'
    when 'payment' then 'payments.view'
    when 'notification' then 'notifications.manage'
    when 'reports' then 'reports.view'
    when 'marketing' then 'marketing.manage'
    when 'multi_branch' then 'branches.manage'
    when 'customer_portal' then 'customer.profile.view'
    when 'white_label' then 'white_label.manage'
    when 'data_ownership_backup' then 'data.export'
    when 'ai_assistant' then 'ai.assistant.access'
    else null
  end
$$;

create or replace function public.module_required_dependencies(target_module_key text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case target_module_key
    when 'pos' then array['inventory', 'payment']
    when 'marketing' then array['notification']
    when 'ai_assistant' then array['reports']
    else array[]::text[]
  end
$$;

-- Sync active package entitlements to businesses that still use package source access.
insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date)
select
  bs.business_id,
  m.module_key,
  pm.access_level,
  pm.is_enabled,
  'package',
  pm.limit_config,
  current_date
from public.business_subscriptions bs
join public.package_modules pm on pm.package_id = bs.package_id
join public.modules m on m.id = pm.module_id
where bs.status in ('trial', 'active', 'past_due')
  and pm.is_enabled = true
  and pm.access_level <> 'none'
on conflict (business_id, module_key, source) do update set
  access_level = excluded.access_level,
  is_enabled = excluded.is_enabled,
  limit_config = excluded.limit_config,
  updated_at = now();

update public.business_module_access bma
set is_enabled = false,
    access_level = 'none',
    updated_at = now()
where bma.source = 'package'
  and exists (
    select 1
    from public.business_subscriptions bs
    join public.package_modules pm on pm.package_id = bs.package_id
    join public.modules m on m.id = pm.module_id
    where bs.business_id = bma.business_id
      and bs.status in ('trial', 'active', 'past_due')
      and m.module_key = bma.module_key
      and (pm.is_enabled = false or pm.access_level = 'none')
  );

insert into public.usage_counters (business_id, module_key, usage_key, used_count, limit_count, period_start, period_end)
select
  bma.business_id,
  bma.module_key,
  limit_key,
  0,
  nullif(bma.limit_config ->> limit_key, '')::int,
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '1 month - 1 day')::date
from public.business_module_access bma
cross join lateral (
  values ('bookings_per_month'), ('whatsapp_messages_per_month')
) keys(limit_key)
where bma.limit_config ? limit_key
  and jsonb_typeof(bma.limit_config -> limit_key) = 'number'
on conflict (business_id, module_key, usage_key, period_start, period_end) do update set
  limit_count = excluded.limit_count,
  updated_at = now();
