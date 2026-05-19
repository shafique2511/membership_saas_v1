-- Phase 28: CSV import system.
-- Additive import history and audit logging for tenant-scoped business imports.

create table if not exists public.csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  imported_by uuid references auth.users(id) on delete set null,
  import_type text not null check (import_type in ('customers', 'products', 'services', 'memberships', 'inventory')),
  file_name text,
  status text not null default 'completed' check (status in ('previewed', 'completed', 'failed')),
  total_rows int not null default 0 check (total_rows >= 0),
  inserted_rows int not null default 0 check (inserted_rows >= 0),
  updated_rows int not null default 0 check (updated_rows >= 0),
  skipped_rows int not null default 0 check (skipped_rows >= 0),
  error_rows int not null default 0 check (error_rows >= 0),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists csv_import_batches_business_id_idx on public.csv_import_batches(business_id);
create index if not exists csv_import_batches_imported_by_idx on public.csv_import_batches(imported_by);
create index if not exists csv_import_batches_created_at_idx on public.csv_import_batches(created_at);

drop trigger if exists set_csv_import_batches_updated_at on public.csv_import_batches;
create trigger set_csv_import_batches_updated_at before update on public.csv_import_batches
for each row execute function public.set_updated_at();

alter table public.csv_import_batches enable row level security;

create or replace function public.can_import_business_data(p_business_id uuid)
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

  if v_role = 'manager' then
    return public.has_staff_permission(p_business_id, 'data.import');
  end if;

  return false;
end;
$$;

drop policy if exists "csv import batches tenant read" on public.csv_import_batches;
create policy "csv import batches tenant read" on public.csv_import_batches
for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or public.has_business_access(business_id)
);

drop policy if exists "csv import batches permitted insert" on public.csv_import_batches;
create policy "csv import batches permitted insert" on public.csv_import_batches
for insert to authenticated
with check (public.can_import_business_data(business_id));

create or replace function public.log_csv_import_batch(
  p_business_id uuid,
  p_import_type text,
  p_file_name text default null,
  p_status text default 'completed',
  p_total_rows int default 0,
  p_inserted_rows int default 0,
  p_updated_rows int default 0,
  p_skipped_rows int default 0,
  p_error_rows int default 0,
  p_summary jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_import_business_data(p_business_id) then
    raise exception 'Not allowed to import data for this business';
  end if;

  insert into public.csv_import_batches (
    business_id,
    imported_by,
    import_type,
    file_name,
    status,
    total_rows,
    inserted_rows,
    updated_rows,
    skipped_rows,
    error_rows,
    summary
  )
  values (
    p_business_id,
    auth.uid(),
    p_import_type,
    p_file_name,
    p_status,
    p_total_rows,
    p_inserted_rows,
    p_updated_rows,
    p_skipped_rows,
    p_error_rows,
    p_summary
  )
  returning id into v_id;

  insert into public.audit_logs (
    business_id,
    user_id,
    action,
    table_name,
    record_id,
    new_data
  )
  values (
    p_business_id,
    auth.uid(),
    'csv_import.' || p_import_type,
    'csv_import_batches',
    v_id,
    jsonb_build_object(
      'file_name', p_file_name,
      'status', p_status,
      'total_rows', p_total_rows,
      'inserted_rows', p_inserted_rows,
      'updated_rows', p_updated_rows,
      'skipped_rows', p_skipped_rows,
      'error_rows', p_error_rows,
      'summary', p_summary
    )
  );

  return v_id;
end;
$$;

insert into public.staff_permissions (business_id, role, permission_key, is_granted)
select b.id, 'owner', 'data.import', true
from public.businesses b
on conflict (business_id, role, permission_key) do update set
  is_granted = true,
  updated_at = now();
