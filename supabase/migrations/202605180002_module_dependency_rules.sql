-- Phase 26: Module dependency rules
-- Enforces backend-safe module dependencies for packages and business access.

create or replace function public.module_required_dependencies(target_module_key text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case target_module_key
    when 'pos' then array['inventory', 'payment']
    when 'marketing' then array['notification']
    else array[]::text[]
  end
$$;

create or replace function public.customer_portal_support_modules()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['booking', 'membership', 'loyalty', 'pos']
$$;

create or replace function public.sync_package_module_dependencies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_key text;
  v_dependency_key text;
  v_dependency_module_id uuid;
  v_default_portal_module_id uuid;
begin
  select module_key into v_module_key
  from public.modules
  where id = new.module_id;

  if new.is_enabled = true and new.access_level <> 'none' then
    foreach v_dependency_key in array public.module_required_dependencies(v_module_key)
    loop
      select id into v_dependency_module_id
      from public.modules
      where module_key = v_dependency_key;

      if v_dependency_module_id is not null then
        insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
        values (new.package_id, v_dependency_module_id, 'basic', '{}'::jsonb, true)
        on conflict (package_id, module_id) do update set
          is_enabled = true,
          access_level = case
            when public.package_modules.access_level = 'none' then excluded.access_level
            else public.package_modules.access_level
          end;
      end if;
    end loop;

    if v_module_key = 'customer_portal' and not exists (
      select 1
      from public.package_modules pm
      join public.modules m on m.id = pm.module_id
      where pm.package_id = new.package_id
        and m.module_key = any(public.customer_portal_support_modules())
        and pm.is_enabled = true
        and pm.access_level <> 'none'
    ) then
      select id into v_default_portal_module_id
      from public.modules
      where module_key = 'booking';

      if v_default_portal_module_id is not null then
        insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
        values (new.package_id, v_default_portal_module_id, 'basic', '{}'::jsonb, true)
        on conflict (package_id, module_id) do update set
          is_enabled = true,
          access_level = case
            when public.package_modules.access_level = 'none' then excluded.access_level
            else public.package_modules.access_level
          end;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_package_dependency_break()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_key text;
begin
  select module_key into v_module_key
  from public.modules
  where id = coalesce(new.module_id, old.module_id);

  if tg_op = 'DELETE' or new.is_enabled = false or new.access_level = 'none' then
    if exists (
      select 1
      from public.package_modules dependent_pm
      join public.modules dependent_m on dependent_m.id = dependent_pm.module_id
      where dependent_pm.package_id = old.package_id
        and dependent_pm.is_enabled = true
        and dependent_pm.access_level <> 'none'
        and v_module_key = any(public.module_required_dependencies(dependent_m.module_key))
    ) then
      raise exception 'Module % cannot be disabled while another enabled package module depends on it', v_module_key using errcode = 'P0001';
    end if;

    if v_module_key = any(public.customer_portal_support_modules()) and exists (
      select 1
      from public.package_modules portal_pm
      join public.modules portal_m on portal_m.id = portal_pm.module_id
      where portal_pm.package_id = old.package_id
        and portal_m.module_key = 'customer_portal'
        and portal_pm.is_enabled = true
        and portal_pm.access_level <> 'none'
    ) and not exists (
      select 1
      from public.package_modules support_pm
      join public.modules support_m on support_m.id = support_pm.module_id
      where support_pm.package_id = old.package_id
        and support_m.module_key = any(public.customer_portal_support_modules())
        and support_m.module_key <> v_module_key
        and support_pm.is_enabled = true
        and support_pm.access_level <> 'none'
    ) then
      raise exception 'At least one customer-facing module must stay enabled while Customer Portal is enabled' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.sync_business_module_dependencies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dependency_key text;
begin
  if new.is_enabled = true and new.access_level <> 'none' then
    foreach v_dependency_key in array public.module_required_dependencies(new.module_key)
    loop
      insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date, end_date)
      values (new.business_id, v_dependency_key, 'basic', true, new.source, '{}'::jsonb, new.start_date, new.end_date)
      on conflict (business_id, module_key, source) do update set
        is_enabled = true,
        access_level = case
          when public.business_module_access.access_level = 'none' then excluded.access_level
          else public.business_module_access.access_level
        end,
        end_date = excluded.end_date,
        updated_at = now();
    end loop;

    if new.module_key = 'customer_portal' and not exists (
      select 1
      from public.business_module_access bma
      where bma.business_id = new.business_id
        and bma.module_key = any(public.customer_portal_support_modules())
        and bma.is_enabled = true
        and bma.access_level <> 'none'
        and bma.start_date <= current_date
        and (bma.end_date is null or bma.end_date >= current_date)
    ) then
      insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date, end_date)
      values (new.business_id, 'booking', 'basic', true, new.source, '{}'::jsonb, new.start_date, new.end_date)
      on conflict (business_id, module_key, source) do update set
        is_enabled = true,
        access_level = case
          when public.business_module_access.access_level = 'none' then excluded.access_level
          else public.business_module_access.access_level
        end,
        end_date = excluded.end_date,
        updated_at = now();
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_business_dependency_break()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or new.is_enabled = false or new.access_level = 'none' then
    if exists (
      select 1
      from public.business_module_access dependent
      where dependent.business_id = old.business_id
        and dependent.is_enabled = true
        and dependent.access_level <> 'none'
        and dependent.start_date <= current_date
        and (dependent.end_date is null or dependent.end_date >= current_date)
        and old.module_key = any(public.module_required_dependencies(dependent.module_key))
    ) then
      raise exception 'Module % cannot be disabled while another enabled business module depends on it', old.module_key using errcode = 'P0001';
    end if;

    if old.module_key = any(public.customer_portal_support_modules()) and exists (
      select 1
      from public.business_module_access portal
      where portal.business_id = old.business_id
        and portal.module_key = 'customer_portal'
        and portal.is_enabled = true
        and portal.access_level <> 'none'
        and portal.start_date <= current_date
        and (portal.end_date is null or portal.end_date >= current_date)
    ) and not exists (
      select 1
      from public.business_module_access support
      where support.business_id = old.business_id
        and support.module_key = any(public.customer_portal_support_modules())
        and support.module_key <> old.module_key
        and support.is_enabled = true
        and support.access_level <> 'none'
        and support.start_date <= current_date
        and (support.end_date is null or support.end_date >= current_date)
    ) then
      raise exception 'At least one customer-facing module must stay enabled while Customer Portal is enabled' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_package_module_dependencies_after_write on public.package_modules;
create trigger sync_package_module_dependencies_after_write
after insert or update of access_level, is_enabled on public.package_modules
for each row execute function public.sync_package_module_dependencies();

drop trigger if exists prevent_package_dependency_break_before_write on public.package_modules;
create trigger prevent_package_dependency_break_before_write
before update of access_level, is_enabled or delete on public.package_modules
for each row execute function public.prevent_package_dependency_break();

drop trigger if exists sync_business_module_dependencies_after_write on public.business_module_access;
create trigger sync_business_module_dependencies_after_write
after insert or update of access_level, is_enabled on public.business_module_access
for each row execute function public.sync_business_module_dependencies();

drop trigger if exists prevent_business_dependency_break_before_write on public.business_module_access;
create trigger prevent_business_dependency_break_before_write
before update of access_level, is_enabled or delete on public.business_module_access
for each row execute function public.prevent_business_dependency_break();

-- Repair existing package access.
insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
select distinct pm.package_id, dependency_module.id, 'basic', '{}'::jsonb, true
from public.package_modules pm
join public.modules dependent_module on dependent_module.id = pm.module_id
join lateral unnest(public.module_required_dependencies(dependent_module.module_key)) dependency(module_key) on true
join public.modules dependency_module on dependency_module.module_key = dependency.module_key
where pm.is_enabled = true
  and pm.access_level <> 'none'
on conflict (package_id, module_id) do update set
  is_enabled = true,
  access_level = case
    when public.package_modules.access_level = 'none' then excluded.access_level
    else public.package_modules.access_level
  end;

insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
select portal_pm.package_id, booking_module.id, 'basic', '{}'::jsonb, true
from public.package_modules portal_pm
join public.modules portal_module on portal_module.id = portal_pm.module_id and portal_module.module_key = 'customer_portal'
join public.modules booking_module on booking_module.module_key = 'booking'
where portal_pm.is_enabled = true
  and portal_pm.access_level <> 'none'
  and not exists (
    select 1
    from public.package_modules support_pm
    join public.modules support_module on support_module.id = support_pm.module_id
    where support_pm.package_id = portal_pm.package_id
      and support_module.module_key = any(public.customer_portal_support_modules())
      and support_pm.is_enabled = true
      and support_pm.access_level <> 'none'
  )
on conflict (package_id, module_id) do update set
  is_enabled = true;

-- Repair existing business access.
insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date, end_date)
select distinct bma.business_id, dependency.module_key, 'basic', true, bma.source, '{}'::jsonb, bma.start_date, bma.end_date
from public.business_module_access bma
join lateral unnest(public.module_required_dependencies(bma.module_key)) dependency(module_key) on true
where bma.is_enabled = true
  and bma.access_level <> 'none'
on conflict (business_id, module_key, source) do update set
  is_enabled = true,
  access_level = case
    when public.business_module_access.access_level = 'none' then excluded.access_level
    else public.business_module_access.access_level
  end,
  end_date = excluded.end_date,
  updated_at = now();

insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date, end_date)
select portal.business_id, 'booking', 'basic', true, portal.source, '{}'::jsonb, portal.start_date, portal.end_date
from public.business_module_access portal
where portal.module_key = 'customer_portal'
  and portal.is_enabled = true
  and portal.access_level <> 'none'
  and not exists (
    select 1
    from public.business_module_access support
    where support.business_id = portal.business_id
      and support.module_key = any(public.customer_portal_support_modules())
      and support.is_enabled = true
      and support.access_level <> 'none'
      and support.start_date <= current_date
      and (support.end_date is null or support.end_date >= current_date)
  )
on conflict (business_id, module_key, source) do update set
  is_enabled = true,
  updated_at = now();
