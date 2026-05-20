-- Phase 35: Audit logs
-- Additive hardening and trigger-based tracking for important tenant actions.

alter table public.audit_logs
  add column if not exists ip_address inet,
  add column if not exists user_agent text;

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_business_created_at_idx on public.audit_logs(business_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action);

create or replace function public.request_header(header_name text)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers jsonb;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;

  return coalesce(
    v_headers ->> lower(header_name),
    v_headers ->> header_name
  );
end;
$$;

create or replace function public.audit_request_ip()
returns inet
language plpgsql
stable
set search_path = public
as $$
declare
  v_forwarded_for text;
  v_real_ip text;
begin
  v_forwarded_for := public.request_header('x-forwarded-for');
  v_real_ip := public.request_header('x-real-ip');

  begin
    return nullif(split_part(coalesce(v_forwarded_for, v_real_ip), ',', 1), '')::inet;
  exception when others then
    return null;
  end;
end;
$$;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Audit logs cannot be edited by normal users' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_audit_log_update on public.audit_logs;
create trigger prevent_audit_log_update
before update on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists prevent_audit_log_delete on public.audit_logs;
create trigger prevent_audit_log_delete
before delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

create or replace function public.audit_important_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_row jsonb := coalesce(v_new, v_old);
  v_business_id uuid;
  v_record_id uuid;
  v_action text;
  v_ip inet;
  v_user_agent text;
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;

  if tg_table_name = 'businesses' then
    v_business_id := nullif(v_row ->> 'id', '')::uuid;
  elsif (v_row ? 'business_id') then
    v_business_id := nullif(v_row ->> 'business_id', '')::uuid;
  end if;

  if (v_row ? 'id') then
    v_record_id := nullif(v_row ->> 'id', '')::uuid;
  end if;

  v_action := case tg_table_name
    when 'bookings' then
      case
        when tg_op = 'INSERT' then 'created_booking'
        when tg_op = 'DELETE' then 'deleted_booking'
        when tg_op = 'UPDATE' and coalesce(new.status, '') = 'cancelled' and coalesce(old.status, '') <> 'cancelled' then 'cancelled_booking'
        when tg_op = 'UPDATE' then 'edited_booking'
      end
    when 'customers' then
      case
        when tg_op = 'INSERT' then 'created_customer'
        when tg_op = 'DELETE' then 'deleted_customer'
        when tg_op = 'UPDATE' then 'edited_customer'
      end
    when 'payments' then
      case
        when tg_op = 'INSERT' then 'created_payment'
        when tg_op = 'UPDATE' and (
          coalesce(new.status, '') = 'refunded'
          or coalesce(new.refunded_amount, 0) > coalesce(old.refunded_amount, 0)
        ) then 'refunded_payment'
        when tg_op = 'UPDATE' then 'edited_payment'
      end
    when 'refunds' then 'refunded_payment'
    when 'backup_requests' then
      case
        when tg_op = 'INSERT' then 'exported_backup'
        when tg_op = 'UPDATE' and coalesce(new.status, '') = 'downloaded' and coalesce(old.status, '') <> 'downloaded' then 'downloaded_backup'
      end
    when 'business_subscriptions' then 'changed_package'
    when 'business_module_access' then 'changed_module_access'
    when 'staff_permissions' then 'changed_staff_permission'
    when 'staff_user_permissions' then 'changed_staff_permission'
    when 'staff_permission_roles' then 'changed_staff_permission'
    when 'businesses' then 'changed_business_settings'
    when 'booking_rules' then 'changed_business_settings'
    when 'payment_settings' then 'changed_business_settings'
    when 'loyalty_settings' then 'changed_business_settings'
    when 'notification_settings' then 'changed_business_settings'
    when 'white_label_settings' then 'changed_business_settings'
    when 'pos_orders' then
      case
        when tg_op = 'INSERT' then 'created_pos_order'
        when tg_op = 'UPDATE' then 'edited_pos_order'
      end
    when 'products' then 'edited_inventory'
    when 'inventory_transactions' then 'edited_inventory'
    when 'memberships' then
      case
        when tg_op = 'INSERT' then 'created_membership'
        when tg_op = 'UPDATE' and coalesce(new.status, '') = 'cancelled' and coalesce(old.status, '') <> 'cancelled' then 'cancelled_membership'
        when tg_op = 'DELETE' then 'cancelled_membership'
      end
  end;

  if v_action is null or v_business_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_ip := public.audit_request_ip();
  v_user_agent := public.request_header('user-agent');

  insert into public.audit_logs (
    business_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  )
  values (
    v_business_id,
    auth.uid(),
    v_action,
    tg_table_name,
    v_record_id,
    v_old,
    v_new,
    v_ip,
    v_user_agent
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'bookings',
    'customers',
    'payments',
    'refunds',
    'backup_requests',
    'business_subscriptions',
    'business_module_access',
    'staff_permissions',
    'staff_user_permissions',
    'staff_permission_roles',
    'businesses',
    'booking_rules',
    'payment_settings',
    'loyalty_settings',
    'notification_settings',
    'white_label_settings',
    'pos_orders',
    'products',
    'inventory_transactions',
    'memberships'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists audit_important_action_%I on public.%I', v_table, v_table);
      execute format(
        'create trigger audit_important_action_%I after insert or update or delete on public.%I for each row execute function public.audit_important_action()',
        v_table,
        v_table
      );
    end if;
  end loop;
end $$;

grant execute on function public.request_header(text) to authenticated;
grant execute on function public.audit_request_ip() to authenticated;
