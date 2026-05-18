-- Phase 24: production permission hardening
-- Adds individual staff permissions and restricts who can manage staff access.

create table if not exists public.staff_user_permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  permission_key text not null,
  is_granted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, staff_id, permission_key)
);

create index if not exists staff_user_permissions_business_id_idx on public.staff_user_permissions(business_id);
create index if not exists staff_user_permissions_staff_id_idx on public.staff_user_permissions(staff_id);

alter table public.staff_user_permissions enable row level security;

drop policy if exists "staff user permissions tenant read" on public.staff_user_permissions;
create policy "staff user permissions tenant read" on public.staff_user_permissions
  for select to authenticated
  using (public.has_business_access(business_id));

drop policy if exists "staff user permissions owner write" on public.staff_user_permissions;
create policy "staff user permissions owner write" on public.staff_user_permissions
  for all to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  )
  with check (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  );

drop trigger if exists set_staff_user_permissions_updated_at on public.staff_user_permissions;
create trigger set_staff_user_permissions_updated_at before update on public.staff_user_permissions
  for each row execute function public.set_updated_at();

create or replace function public.business_has_module_access(target_business_id uuid, target_module_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.business_module_access bma
      where bma.business_id = target_business_id
        and bma.module_key = target_module_key
        and bma.is_enabled = true
        and bma.access_level <> 'none'
        and bma.start_date <= current_date
        and (bma.end_date is null or bma.end_date >= current_date)
    ),
    false
  )
$$;

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
    else null
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

  select s.id into v_staff_id
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
    and sp.role = v_role
    and sp.permission_key = target_permission_key
  limit 1;

  if v_override is not null then
    return v_override;
  end if;

  return public.default_role_permission(v_role, target_permission_key);
end;
$$;

create or replace function public.has_module_access(target_business_id uuid, target_module_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    public.is_super_admin(auth.uid())
    or (
      public.business_has_module_access(target_business_id, target_module_key)
      and (
        public.user_role(auth.uid()) in ('owner', 'customer')
        or public.has_staff_permission(target_business_id, public.module_permission_key(target_module_key))
      )
    ),
    false
  )
$$;

-- Package-limit triggers enforce business entitlements, not the permissions of the
-- currently authenticated dashboard user. This keeps seeds, service operations,
-- and backend automation from failing after has_module_access became user-aware.
create or replace function public.enforce_branch_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  if not public.business_has_module_access(new.business_id, 'core')
    and exists (select 1 from public.business_module_access where business_id = new.business_id)
  then
    raise exception 'Core module is not enabled for this business' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
  from public.branches
  where business_id = new.business_id;

  perform public.assert_business_limit(new.business_id, 'core', 'branches', existing_count);
  perform public.upsert_usage_counter(new.business_id, 'core', 'branches', 1, public.get_business_limit(new.business_id, 'core', 'branches'));
  return new;
end;
$$;

create or replace function public.enforce_staff_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  if not public.business_has_module_access(new.business_id, 'core') then
    raise exception 'Core module is not enabled for this business' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
  from public.staff
  where business_id = new.business_id
    and status = 'active';

  perform public.assert_business_limit(new.business_id, 'core', 'staff', existing_count);
  perform public.upsert_usage_counter(new.business_id, 'core', 'staff', 1, public.get_business_limit(new.business_id, 'core', 'staff'));
  return new;
end;
$$;

create or replace function public.enforce_customer_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
begin
  if not public.business_has_module_access(new.business_id, 'core') then
    raise exception 'Core module is not enabled for this business' using errcode = 'P0001';
  end if;

  select count(*) into existing_count
  from public.customers
  where business_id = new.business_id
    and status = 'active';

  perform public.assert_business_limit(new.business_id, 'core', 'customers', existing_count);
  perform public.upsert_usage_counter(new.business_id, 'core', 'customers', 1, public.get_business_limit(new.business_id, 'core', 'customers'));
  return new;
end;
$$;

create or replace function public.enforce_booking_package_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.business_has_module_access(new.business_id, 'booking') then
    raise exception 'Booking module is not enabled for this business' using errcode = 'P0001';
  end if;

  perform public.assert_monthly_usage_limit(new.business_id, 'booking', 'bookings_per_month', 'bookings_per_month');
  return new;
end;
$$;

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

create or replace function public.get_staff_user_permissions(p_business_id uuid, p_staff_id uuid default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sup.id,
      'staff_id', sup.staff_id,
      'permission_key', sup.permission_key,
      'is_granted', sup.is_granted,
      'staff', jsonb_build_object('full_name', s.full_name, 'email', s.email, 'role', s.role)
    )
    order by s.full_name, sup.permission_key
  ), '[]'::jsonb)
  from public.staff_user_permissions sup
  join public.staff s on s.id = sup.staff_id
  where sup.business_id = p_business_id
    and (p_staff_id is null or sup.staff_id = p_staff_id)
    and public.has_business_access(p_business_id)
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
  if not (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(p_business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  ) then
    raise exception 'Only owners can manage role permissions';
  end if;

  if p_role not in ('manager', 'staff') then
    raise exception 'Role permission can only be set for manager or staff';
  end if;

  insert into public.staff_permissions (business_id, role, permission_key, is_granted)
  values (p_business_id, p_role, p_permission_key, p_is_granted)
  on conflict (business_id, role, permission_key) do update set
    is_granted = p_is_granted,
    updated_at = now();
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
      and p_permission_key not in ('staff.permissions.manage', 'settings.manage', 'billing.manage', 'business.manage', 'platform.access')
    )
  ) then
    raise exception 'Not allowed to manage this staff permission';
  end if;

  insert into public.staff_user_permissions (business_id, staff_id, permission_key, is_granted)
  values (p_business_id, p_staff_id, p_permission_key, p_is_granted)
  on conflict (business_id, staff_id, permission_key) do update set
    is_granted = p_is_granted,
    updated_at = now();
end;
$$;
