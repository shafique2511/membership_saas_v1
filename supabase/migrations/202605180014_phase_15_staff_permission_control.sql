-- Phase 15: staff permission control hardening
-- Adds owner-managed custom permission roles, staff role assignment, missing
-- permission keys, and audit logging for every permission change.

alter table public.staff
  add column if not exists permission_role_key text;

create index if not exists staff_permission_role_key_idx on public.staff(business_id, permission_role_key);

alter table public.staff_permissions
  drop constraint if exists staff_permissions_role_check;

alter table public.staff_permissions
  drop constraint if exists staff_permissions_role_format_check;

alter table public.staff_permissions
  add constraint staff_permissions_role_format_check
  check (role ~ '^[a-z][a-z0-9_]{1,40}$');

create table if not exists public.staff_custom_roles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role_key text not null check (role_key ~ '^[a-z][a-z0-9_]{1,40}$'),
  role_name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, role_key)
);

create index if not exists staff_custom_roles_business_id_idx on public.staff_custom_roles(business_id);

alter table public.staff_custom_roles enable row level security;

drop policy if exists "staff custom roles tenant read" on public.staff_custom_roles;
create policy "staff custom roles tenant read" on public.staff_custom_roles
for select to authenticated
using (public.has_business_access(business_id));

drop policy if exists "staff custom roles owner write" on public.staff_custom_roles;
create policy "staff custom roles owner write" on public.staff_custom_roles
for all to authenticated
using (
  public.is_super_admin(auth.uid())
  or (public.has_business_access(business_id) and public.user_role(auth.uid()) = 'owner')
)
with check (
  public.is_super_admin(auth.uid())
  or (public.has_business_access(business_id) and public.user_role(auth.uid()) = 'owner')
);

drop trigger if exists set_staff_custom_roles_updated_at on public.staff_custom_roles;
create trigger set_staff_custom_roles_updated_at before update on public.staff_custom_roles
  for each row execute function public.set_updated_at();

drop policy if exists "staff_permissions tenant all" on public.staff_permissions;

drop policy if exists "staff permissions tenant read" on public.staff_permissions;
create policy "staff permissions tenant read" on public.staff_permissions
for select to authenticated
using (public.has_business_access(business_id));

drop policy if exists "staff permissions owner write" on public.staff_permissions;
create policy "staff permissions owner write" on public.staff_permissions
for all to authenticated
using (
  public.is_super_admin(auth.uid())
  or (public.has_business_access(business_id) and public.user_role(auth.uid()) = 'owner')
)
with check (
  public.is_super_admin(auth.uid())
  or (public.has_business_access(business_id) and public.user_role(auth.uid()) = 'owner')
);

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
      'pos.discount',
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

create or replace function public.has_staff_permission(target_business_id uuid, target_permission_key text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text;
  v_staff_id uuid;
  v_permission_role_key text;
  v_override boolean;
begin
  if public.is_super_admin(auth.uid()) then
    return true;
  end if;

  select up.role into v_role
  from public.user_profiles up
  where up.id = auth.uid()
    and up.status = 'active'
    and (up.business_id = target_business_id or up.role = 'customer')
  limit 1;

  if v_role is null then
    return false;
  end if;

  if v_role = 'owner' then
    return true;
  end if;

  select s.id, s.permission_role_key
  into v_staff_id, v_permission_role_key
  from public.staff s
  where s.business_id = target_business_id
    and s.user_id = auth.uid()
    and s.status = 'active'
  limit 1;

  if v_staff_id is not null then
    select sup.is_granted into v_override
    from public.staff_user_permissions sup
    where sup.business_id = target_business_id
      and sup.staff_id = v_staff_id
      and sup.permission_key = target_permission_key
    limit 1;

    if v_override is not null then
      return v_override;
    end if;
  end if;

  select sp.is_granted into v_override
  from public.staff_permissions sp
  where sp.business_id = target_business_id
    and sp.role = coalesce(v_permission_role_key, v_role)
    and sp.permission_key = target_permission_key
  limit 1;

  if v_override is not null then
    return v_override;
  end if;

  if v_permission_role_key is not null then
    return false;
  end if;

  return public.default_role_permission(v_role, target_permission_key);
end;
$$;

create or replace function public.get_staff_custom_roles(p_business_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', scr.id,
      'business_id', scr.business_id,
      'role_key', scr.role_key,
      'role_name', scr.role_name,
      'description', scr.description,
      'is_active', scr.is_active
    )
    order by scr.role_name
  ), '[]'::jsonb)
  from public.staff_custom_roles scr
  where scr.business_id = p_business_id
    and scr.is_active = true
    and public.has_business_access(p_business_id)
$$;

create or replace function public.create_staff_custom_role(
  p_business_id uuid,
  p_role_name text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_key text;
  v_role public.staff_custom_roles%rowtype;
begin
  if not (
    public.is_super_admin(auth.uid())
    or (public.has_business_access(p_business_id) and public.user_role(auth.uid()) = 'owner')
  ) then
    raise exception 'Only owners can create custom staff roles';
  end if;

  v_role_key := lower(regexp_replace(trim(p_role_name), '[^a-zA-Z0-9]+', '_', 'g'));
  v_role_key := trim(both '_' from v_role_key);

  if v_role_key = '' then
    raise exception 'Role name is required';
  end if;

  if v_role_key !~ '^[a-z]' then
    v_role_key := 'role_' || v_role_key;
  end if;

  if v_role_key in ('super_admin', 'owner', 'manager', 'staff', 'customer') then
    v_role_key := 'custom_' || v_role_key;
  end if;

  v_role_key := left(v_role_key, 40);

  insert into public.staff_custom_roles (business_id, role_key, role_name, description, created_by)
  values (p_business_id, v_role_key, trim(p_role_name), nullif(trim(coalesce(p_description, '')), ''), auth.uid())
  on conflict (business_id, role_key) do update set
    role_name = excluded.role_name,
    description = excluded.description,
    is_active = true,
    updated_at = now()
  returning * into v_role;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    p_business_id,
    auth.uid(),
    'staff_custom_role.upserted',
    'staff_custom_roles',
    v_role.id,
    null,
    to_jsonb(v_role)
  );

  return jsonb_build_object(
    'id', v_role.id,
    'business_id', v_role.business_id,
    'role_key', v_role.role_key,
    'role_name', v_role.role_name,
    'description', v_role.description,
    'is_active', v_role.is_active
  );
end;
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
declare
  v_permission_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  if not (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(p_business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  ) then
    raise exception 'Only owners can manage role permissions';
  end if;

  if p_role not in ('manager', 'staff')
    and not exists (
      select 1 from public.staff_custom_roles
      where business_id = p_business_id
        and role_key = p_role
        and is_active = true
    )
  then
    raise exception 'Unknown staff permission role';
  end if;

  select to_jsonb(sp.*), sp.id
  into v_old, v_permission_id
  from public.staff_permissions sp
  where sp.business_id = p_business_id
    and sp.role = p_role
    and sp.permission_key = p_permission_key;

  insert into public.staff_permissions (business_id, role, permission_key, is_granted)
  values (p_business_id, p_role, p_permission_key, p_is_granted)
  on conflict (business_id, role, permission_key) do update set
    is_granted = p_is_granted,
    updated_at = now()
  returning id into v_permission_id;

  select to_jsonb(sp.*) into v_new
  from public.staff_permissions sp
  where sp.id = v_permission_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (p_business_id, auth.uid(), 'staff_permission.changed', 'staff_permissions', v_permission_id, v_old, v_new);
end;
$$;

create or replace function public.set_staff_user_permission(
  p_business_id uuid,
  p_staff_id uuid,
  p_permission_key text,
  p_is_granted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
  v_caller_role text;
  v_permission_id uuid;
  v_old jsonb;
  v_new jsonb;
begin
  select role into v_target_role
  from public.staff
  where id = p_staff_id
    and business_id = p_business_id
    and status = 'active';

  if v_target_role is null then
    raise exception 'Staff member not found';
  end if;

  if v_target_role <> 'staff' then
    raise exception 'Managers can only assign permissions to staff users';
  end if;

  v_caller_role := public.user_role(auth.uid());

  if not (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(p_business_id)
      and v_caller_role = 'owner'
    )
    or (
      public.has_business_access(p_business_id)
      and v_caller_role = 'manager'
      and public.has_staff_permission(p_business_id, 'staff.permissions.manage')
      and (not p_is_granted or public.has_staff_permission(p_business_id, p_permission_key))
      and p_permission_key not in (
        'staff.permissions.manage',
        'settings.manage',
        'billing.manage',
        'business.manage',
        'business.delete',
        'platform.access',
        'data.export',
        'data.backup.manage',
        'records.delete'
      )
    )
  ) then
    raise exception 'Not allowed to manage this staff permission';
  end if;

  select to_jsonb(sup.*), sup.id
  into v_old, v_permission_id
  from public.staff_user_permissions sup
  where sup.business_id = p_business_id
    and sup.staff_id = p_staff_id
    and sup.permission_key = p_permission_key;

  insert into public.staff_user_permissions (business_id, staff_id, permission_key, is_granted)
  values (p_business_id, p_staff_id, p_permission_key, p_is_granted)
  on conflict (business_id, staff_id, permission_key) do update set
    is_granted = p_is_granted,
    updated_at = now()
  returning id into v_permission_id;

  select to_jsonb(sup.*) into v_new
  from public.staff_user_permissions sup
  where sup.id = v_permission_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (p_business_id, auth.uid(), 'staff_user_permission.changed', 'staff_user_permissions', v_permission_id, v_old, v_new);
end;
$$;

create or replace function public.set_staff_permission_role(
  p_business_id uuid,
  p_staff_id uuid,
  p_role_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if not (
    public.is_super_admin(auth.uid())
    or (public.has_business_access(p_business_id) and public.user_role(auth.uid()) = 'owner')
  ) then
    raise exception 'Only owners can assign custom staff roles';
  end if;

  if p_role_key is not null
    and not exists (
      select 1 from public.staff_custom_roles
      where business_id = p_business_id
        and role_key = p_role_key
        and is_active = true
    )
  then
    raise exception 'Custom staff role not found';
  end if;

  select to_jsonb(s.*) into v_old
  from public.staff s
  where s.id = p_staff_id
    and s.business_id = p_business_id
    and s.status = 'active';

  if v_old is null then
    raise exception 'Staff member not found';
  end if;

  update public.staff
  set permission_role_key = p_role_key,
      updated_at = now()
  where id = p_staff_id
    and business_id = p_business_id;

  select to_jsonb(s.*) into v_new
  from public.staff s
  where s.id = p_staff_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (p_business_id, auth.uid(), 'staff_permission_role.assigned', 'staff', p_staff_id, v_old, v_new);
end;
$$;

grant execute on function public.get_staff_custom_roles(uuid) to authenticated;
grant execute on function public.create_staff_custom_role(uuid, text, text) to authenticated;
grant execute on function public.set_staff_permission_role(uuid, uuid, text) to authenticated;
