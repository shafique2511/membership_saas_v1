-- Phase 27: Data ownership, backup, migration, and shutdown policy.
-- Additive hardening for business exports, platform backup requests, download
-- tracking, and shutdown delivery tracking.

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.data_export_requests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%export_scope%';

  if v_constraint_name is not null then
    execute format('alter table public.data_export_requests drop constraint %I', v_constraint_name);
  end if;

  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.data_export_requests'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%export_format%';

  if v_constraint_name is not null then
    execute format('alter table public.data_export_requests drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.data_export_requests
  add constraint data_export_requests_scope_check check (export_scope in (
    'business_full',
    'customers',
    'bookings',
    'memberships',
    'membership_usage',
    'loyalty_points',
    'rewards',
    'pos_orders',
    'inventory',
    'staff',
    'products_services',
    'payments',
    'reports',
    'uploaded_files'
  )),
  add constraint data_export_requests_format_check check (export_format in ('csv', 'excel', 'json', 'zip'));

alter table public.backup_requests
  add column if not exists backup_reason text,
  add column if not exists encryption_status text not null default 'not_applicable' check (encryption_status in ('not_applicable', 'requested', 'encrypted')),
  add column if not exists signed_url text,
  add column if not exists download_count int not null default 0 check (download_count >= 0),
  add column if not exists legal_purpose text,
  add column if not exists migration_target text,
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

update public.backup_requests
set backup_reason = reason
where backup_reason is null
  and reason is not null;

create table if not exists public.shutdown_notice_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  shutdown_setting_id uuid references public.platform_shutdown_settings(id) on delete set null,
  notice_status text not null default 'pending' check (notice_status in ('pending', 'queued', 'sent', 'failed')),
  recipient_email text,
  sent_at timestamptz,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, shutdown_setting_id)
);

create table if not exists public.shutdown_business_backup_tracking (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  backup_request_id uuid references public.backup_requests(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'downloaded', 'expired', 'failed')),
  generated_at timestamptz,
  downloaded_at timestamptz,
  downloaded_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, backup_request_id)
);

create index if not exists shutdown_notice_deliveries_business_id_idx on public.shutdown_notice_deliveries(business_id);
create index if not exists shutdown_notice_deliveries_status_idx on public.shutdown_notice_deliveries(notice_status);
create index if not exists shutdown_business_backup_tracking_business_id_idx on public.shutdown_business_backup_tracking(business_id);
create index if not exists shutdown_business_backup_tracking_status_idx on public.shutdown_business_backup_tracking(status);

drop trigger if exists set_shutdown_notice_deliveries_updated_at on public.shutdown_notice_deliveries;
create trigger set_shutdown_notice_deliveries_updated_at before update on public.shutdown_notice_deliveries
for each row execute function public.set_updated_at();

drop trigger if exists set_shutdown_business_backup_tracking_updated_at on public.shutdown_business_backup_tracking;
create trigger set_shutdown_business_backup_tracking_updated_at before update on public.shutdown_business_backup_tracking
for each row execute function public.set_updated_at();

alter table public.shutdown_notice_deliveries enable row level security;
alter table public.shutdown_business_backup_tracking enable row level security;

drop policy if exists "shutdown notice deliveries super admin all" on public.shutdown_notice_deliveries;
create policy "shutdown notice deliveries super admin all" on public.shutdown_notice_deliveries
for all to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists "shutdown backup tracking super admin all" on public.shutdown_business_backup_tracking;
create policy "shutdown backup tracking super admin all" on public.shutdown_business_backup_tracking
for all to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists "shutdown backup tracking tenant read" on public.shutdown_business_backup_tracking;
create policy "shutdown backup tracking tenant read" on public.shutdown_business_backup_tracking
for select to authenticated
using (public.has_business_access(business_id));

create or replace function public.can_create_business_export(
  p_business_id uuid,
  p_export_scope text default 'business_full'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if public.is_super_admin(auth.uid()) then
    return true;
  end if;

  select role into v_role
  from public.user_profiles
  where id = auth.uid()
    and business_id = p_business_id
    and status = 'active';

  if v_role = 'owner' then
    return true;
  end if;

  if v_role = 'manager' and p_export_scope = 'business_full' then
    return public.has_staff_permission(p_business_id, 'data.backup.manage');
  end if;

  if v_role = 'manager' then
    return public.has_staff_permission(p_business_id, 'data.export');
  end if;

  return false;
end;
$$;

drop policy if exists "data export tenant insert" on public.data_export_requests;
create policy "data export tenant insert" on public.data_export_requests
  for insert to authenticated
  with check (
    public.has_module_access(business_id, 'data_ownership_backup')
    and public.can_create_business_export(business_id, export_scope)
  );

drop policy if exists "backup requests tenant or super admin write" on public.backup_requests;
create policy "backup requests tenant or super admin write" on public.backup_requests
for all to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    business_id is not null
    and scope = 'business'
    and public.can_create_business_export(business_id, 'business_full')
  )
)
with check (
  public.is_super_admin(auth.uid())
  or (
    business_id is not null
    and scope = 'business'
    and public.can_create_business_export(business_id, 'business_full')
  )
);

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
    public.has_module_access(p_business_id, 'data_ownership_backup')
    and public.can_create_business_export(p_business_id, p_export_scope)
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

create or replace function public.create_backup_request(
  p_request_type text,
  p_scope text,
  p_export_format text default 'zip',
  p_business_id uuid default null,
  p_reason text default null,
  p_tables_included jsonb default '[]'::jsonb,
  p_password_confirmed boolean default false,
  p_two_factor_confirmed boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_scope = 'platform' and not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can create platform backups';
  end if;

  if p_scope = 'platform' and coalesce(trim(p_reason), '') = '' then
    raise exception 'Backup reason is required';
  end if;

  if p_scope = 'platform' and not p_password_confirmed then
    raise exception 'Password confirmation is required';
  end if;

  if p_scope = 'business' and p_business_id is null then
    raise exception 'Business backup requires business_id';
  end if;

  if p_scope = 'business' and not public.can_create_business_export(p_business_id, 'business_full') then
    raise exception 'Not allowed to create this business backup';
  end if;

  insert into public.backup_requests (
    business_id,
    requested_by,
    request_type,
    scope,
    export_format,
    status,
    reason,
    backup_reason,
    tables_included,
    password_confirmed_at,
    two_factor_confirmed_at,
    expires_at
  )
  values (
    p_business_id,
    auth.uid(),
    p_request_type,
    p_scope,
    p_export_format,
    'pending',
    p_reason,
    p_reason,
    p_tables_included,
    case when p_password_confirmed then now() else null end,
    case when p_two_factor_confirmed then now() else null end,
    now() + interval '7 days'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_backup_download(
  p_backup_request_id uuid,
  p_signed_url_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_backup public.backup_requests%rowtype;
  v_id uuid;
begin
  select * into v_backup
  from public.backup_requests
  where id = p_backup_request_id;

  if v_backup.id is null then
    raise exception 'Backup request not found';
  end if;

  if not (
    public.is_super_admin(auth.uid())
    or (v_backup.business_id is not null and public.can_create_business_export(v_backup.business_id, 'business_full'))
  ) then
    raise exception 'Not allowed to download this backup';
  end if;

  insert into public.backup_downloads (
    backup_request_id,
    business_id,
    downloaded_by,
    signed_url_expires_at
  )
  values (
    p_backup_request_id,
    v_backup.business_id,
    auth.uid(),
    p_signed_url_expires_at
  )
  returning id into v_id;

  update public.backup_requests
  set download_count = download_count + 1,
      status = case when status = 'ready' then 'downloaded' else status end
  where id = p_backup_request_id;

  update public.shutdown_business_backup_tracking
  set status = 'downloaded',
      downloaded_at = now(),
      downloaded_by = auth.uid()
  where backup_request_id = p_backup_request_id;

  return v_id;
end;
$$;

create or replace function public.queue_shutdown_owner_notices()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_setting_id uuid;
  v_count int;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super admins can queue shutdown notices';
  end if;

  select id into v_setting_id
  from public.platform_shutdown_settings
  order by created_at asc
  limit 1;

  insert into public.shutdown_notice_deliveries (
    business_id,
    shutdown_setting_id,
    notice_status,
    recipient_email,
    created_by
  )
  select distinct on (b.id)
    b.id,
    v_setting_id,
    'queued',
    coalesce(up.email, b.email),
    auth.uid()
  from public.businesses b
  left join public.user_profiles up on up.business_id = b.id and up.role = 'owner' and up.status = 'active'
  where b.status <> 'deleted'
  on conflict (business_id, shutdown_setting_id) do update set
    notice_status = 'queued',
    recipient_email = excluded.recipient_email,
    created_by = auth.uid(),
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
