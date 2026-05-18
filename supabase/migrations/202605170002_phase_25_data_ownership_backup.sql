-- Phase 25: Data Ownership & Backup module
-- Defines business data ownership, export request logging, platform backup logs,
-- and package/module access for the dedicated data ownership module.

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
    'white_label', 'data_ownership_backup'
  ));

insert into public.modules (module_key, module_name, description, category, is_core, sort_order)
values (
  'data_ownership_backup',
  'Data Ownership & Backup',
  'Business data ownership policies, tenant export tools, platform backup logs, migration support, and shutdown procedures.',
  'governance',
  true,
  95
)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  description = excluded.description,
  category = excluded.category,
  is_core = excluded.is_core,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
select p.id, m.id, 'unlimited', '{}'::jsonb, true
from public.packages p
join public.modules m on m.module_key = 'data_ownership_backup'
where p.slug in ('starter', 'growth', 'pro', 'business_suite', 'enterprise')
on conflict (package_id, module_id) do update set
  access_level = excluded.access_level,
  limit_config = excluded.limit_config,
  is_enabled = excluded.is_enabled;

insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config)
select bs.business_id, 'data_ownership_backup', 'unlimited', true, 'package', '{}'::jsonb
from public.business_subscriptions bs
where bs.status in ('trial', 'active', 'past_due')
on conflict (business_id, module_key, source) do update set
  access_level = excluded.access_level,
  is_enabled = excluded.is_enabled,
  limit_config = excluded.limit_config,
  updated_at = now();

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  export_scope text not null default 'business_full' check (export_scope in ('business_full', 'customers', 'bookings', 'memberships', 'payments', 'inventory', 'reports')),
  export_format text not null default 'json' check (export_format in ('json', 'csv', 'sql')),
  status text not null default 'completed' check (status in ('requested', 'processing', 'completed', 'failed', 'expired')),
  file_name text,
  row_counts jsonb not null default '{}'::jsonb,
  notes text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

create index if not exists data_export_requests_business_id_idx on public.data_export_requests(business_id);
create index if not exists data_export_requests_requested_by_idx on public.data_export_requests(requested_by);

alter table public.data_export_requests enable row level security;

drop policy if exists "data export tenant read" on public.data_export_requests;
create policy "data export tenant read" on public.data_export_requests
  for select to authenticated
  using (
    public.has_business_access(business_id)
    and public.has_module_access(business_id, 'data_ownership_backup')
  );

drop policy if exists "data export tenant insert" on public.data_export_requests;
create policy "data export tenant insert" on public.data_export_requests
  for insert to authenticated
  with check (
    public.has_business_access(business_id)
    and public.has_module_access(business_id, 'data_ownership_backup')
    and public.has_staff_permission(business_id, 'data.export')
  );

create table if not exists public.platform_backup_logs (
  id uuid primary key default gen_random_uuid(),
  initiated_by uuid references auth.users(id) on delete set null,
  backup_type text not null check (backup_type in ('scheduled', 'manual', 'pre_migration', 'legal_hold', 'shutdown', 'restore_test')),
  backup_scope text not null default 'full_platform' check (backup_scope in ('full_platform', 'schema_only', 'tenant_export', 'storage_only')),
  status text not null default 'planned' check (status in ('planned', 'running', 'completed', 'failed', 'verified')),
  storage_location text,
  checksum text,
  notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  retention_until date,
  created_at timestamptz not null default now()
);

alter table public.platform_backup_logs enable row level security;

drop policy if exists "platform backup logs super admin read" on public.platform_backup_logs;
create policy "platform backup logs super admin read" on public.platform_backup_logs
  for select to authenticated
  using (public.is_super_admin(auth.uid()));

drop policy if exists "platform backup logs super admin write" on public.platform_backup_logs;
create policy "platform backup logs super admin write" on public.platform_backup_logs
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

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
    else null
  end
$$;

create or replace function public.log_data_export_request(
  p_business_id uuid,
  p_export_scope text default 'business_full',
  p_export_format text default 'json',
  p_file_name text default null,
  p_row_counts jsonb default '{}'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (
    public.has_business_access(p_business_id)
    and public.has_module_access(p_business_id, 'data_ownership_backup')
    and public.has_staff_permission(p_business_id, 'data.export')
  ) then
    raise exception 'Not allowed to export this business data';
  end if;

  insert into public.data_export_requests (
    business_id, requested_by, export_scope, export_format, status, file_name,
    row_counts, notes, completed_at, expires_at
  )
  values (
    p_business_id, auth.uid(), p_export_scope, p_export_format, 'completed',
    p_file_name, p_row_counts, p_notes, now(), now() + interval '7 days'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.log_platform_backup(
  p_backup_type text,
  p_backup_scope text default 'full_platform',
  p_status text default 'planned',
  p_storage_location text default null,
  p_checksum text default null,
  p_notes text default null,
  p_retention_until date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can log platform backups';
  end if;

  insert into public.platform_backup_logs (
    initiated_by, backup_type, backup_scope, status, storage_location,
    checksum, notes, completed_at, retention_until
  )
  values (
    auth.uid(), p_backup_type, p_backup_scope, p_status, p_storage_location,
    p_checksum, p_notes,
    case when p_status in ('completed', 'verified', 'failed') then now() else null end,
    p_retention_until
  )
  returning id into v_id;

  return v_id;
end;
$$;
