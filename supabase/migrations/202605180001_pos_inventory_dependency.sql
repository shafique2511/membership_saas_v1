-- Phase 26: POS requires Inventory
-- Any package, add-on, or business module access that enables POS must also enable Inventory.

create or replace function public.sync_package_pos_inventory_dependency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_key text;
  v_inventory_module_id uuid;
begin
  select module_key into v_module_key
  from public.modules
  where id = new.module_id;

  if v_module_key = 'pos' and new.is_enabled = true and new.access_level <> 'none' then
    select id into v_inventory_module_id
    from public.modules
    where module_key = 'inventory';

    if v_inventory_module_id is not null then
      insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
      values (
        new.package_id,
        v_inventory_module_id,
        case when new.access_level in ('pro', 'advanced', 'unlimited') then new.access_level else 'basic' end,
        '{}'::jsonb,
        true
      )
      on conflict (package_id, module_id) do update set
        access_level = case
          when public.package_modules.access_level = 'unlimited' then public.package_modules.access_level
          when excluded.access_level = 'unlimited' then excluded.access_level
          when excluded.access_level = 'advanced' then excluded.access_level
          when excluded.access_level = 'pro' and public.package_modules.access_level in ('none', 'basic') then excluded.access_level
          else public.package_modules.access_level
        end,
        is_enabled = true;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_package_inventory_disable_with_pos()
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

  if v_module_key = 'inventory' and exists (
    select 1
    from public.package_modules pm
    join public.modules m on m.id = pm.module_id
    where pm.package_id = old.package_id
      and m.module_key = 'pos'
      and pm.is_enabled = true
      and pm.access_level <> 'none'
  ) then
    if tg_op = 'DELETE' or new.is_enabled = false or new.access_level = 'none' then
      raise exception 'Inventory cannot be disabled while POS is enabled for this package' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.sync_business_pos_inventory_dependency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.module_key = 'pos' and new.is_enabled = true and new.access_level <> 'none' then
    insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date, end_date)
    values (
      new.business_id,
      'inventory',
      case when new.access_level in ('pro', 'advanced', 'unlimited') then new.access_level else 'basic' end,
      true,
      new.source,
      '{}'::jsonb,
      new.start_date,
      new.end_date
    )
    on conflict (business_id, module_key, source) do update set
      access_level = case
        when public.business_module_access.access_level = 'unlimited' then public.business_module_access.access_level
        when excluded.access_level = 'unlimited' then excluded.access_level
        when excluded.access_level = 'advanced' then excluded.access_level
        when excluded.access_level = 'pro' and public.business_module_access.access_level in ('none', 'basic') then excluded.access_level
        else public.business_module_access.access_level
      end,
      is_enabled = true,
      end_date = excluded.end_date,
      updated_at = now();
  end if;

  return new;
end;
$$;

create or replace function public.prevent_business_inventory_disable_with_pos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.module_key = 'inventory' and exists (
    select 1
    from public.business_module_access bma
    where bma.business_id = old.business_id
      and bma.module_key = 'pos'
      and bma.is_enabled = true
      and bma.access_level <> 'none'
      and bma.start_date <= current_date
      and (bma.end_date is null or bma.end_date >= current_date)
  ) then
    if tg_op = 'DELETE' or new.is_enabled = false or new.access_level = 'none' then
      raise exception 'Inventory cannot be disabled while POS is enabled for this business' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_package_pos_inventory_dependency_after_write on public.package_modules;
create trigger sync_package_pos_inventory_dependency_after_write
after insert or update of access_level, is_enabled on public.package_modules
for each row execute function public.sync_package_pos_inventory_dependency();

drop trigger if exists prevent_package_inventory_disable_with_pos_before_write on public.package_modules;
create trigger prevent_package_inventory_disable_with_pos_before_write
before update of access_level, is_enabled or delete on public.package_modules
for each row execute function public.prevent_package_inventory_disable_with_pos();

drop trigger if exists sync_business_pos_inventory_dependency_after_write on public.business_module_access;
create trigger sync_business_pos_inventory_dependency_after_write
after insert or update of access_level, is_enabled on public.business_module_access
for each row execute function public.sync_business_pos_inventory_dependency();

drop trigger if exists prevent_business_inventory_disable_with_pos_before_write on public.business_module_access;
create trigger prevent_business_inventory_disable_with_pos_before_write
before update of access_level, is_enabled or delete on public.business_module_access
for each row execute function public.prevent_business_inventory_disable_with_pos();

-- Repair existing data if POS was previously enabled without Inventory.
insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
select pm.package_id, inv.id, case when pm.access_level in ('pro', 'advanced', 'unlimited') then pm.access_level else 'basic' end, '{}'::jsonb, true
from public.package_modules pm
join public.modules pos on pos.id = pm.module_id and pos.module_key = 'pos'
join public.modules inv on inv.module_key = 'inventory'
where pm.is_enabled = true
  and pm.access_level <> 'none'
on conflict (package_id, module_id) do update set
  access_level = case
    when public.package_modules.access_level in ('none', 'basic') then excluded.access_level
    else public.package_modules.access_level
  end,
  is_enabled = true;

insert into public.business_module_access (business_id, module_key, access_level, is_enabled, source, limit_config, start_date, end_date)
select bma.business_id, 'inventory', case when bma.access_level in ('pro', 'advanced', 'unlimited') then bma.access_level else 'basic' end, true, bma.source, '{}'::jsonb, bma.start_date, bma.end_date
from public.business_module_access bma
where bma.module_key = 'pos'
  and bma.is_enabled = true
  and bma.access_level <> 'none'
on conflict (business_id, module_key, source) do update set
  access_level = case
    when public.business_module_access.access_level in ('none', 'basic') then excluded.access_level
    else public.business_module_access.access_level
  end,
  is_enabled = true,
  end_date = excluded.end_date,
  updated_at = now();
