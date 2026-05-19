-- Luxantara Members - Phase 14: Staff commission automation and access hardening
-- Additive/replace-only migration. Does not reset or overwrite staff or commission data.

create unique index if not exists commission_records_unique_source_staff_idx
  on public.commission_records (business_id, staff_id, source_type, source_id)
  where source_id is not null;

create index if not exists commission_records_business_status_created_idx
  on public.commission_records (business_id, status, created_at desc);

create index if not exists commission_rules_business_target_active_idx
  on public.commission_rules (business_id, target_type, target_id, is_active);

create index if not exists staff_business_user_idx
  on public.staff (business_id, user_id)
  where user_id is not null;

create or replace function public.staff_owns_staff_record(target_staff_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = target_staff_id
      and s.user_id = auth.uid()
      and s.status = 'active'
  );
$$;

create or replace function public.calculate_commission_amount(
  p_commission_type text,
  p_rate numeric,
  p_base_amount numeric,
  p_quantity numeric default 1
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select round(greatest(0, case
    when p_commission_type = 'fixed' then coalesce(p_rate, 0) * greatest(coalesce(p_quantity, 1), 1)
    when p_commission_type in ('percentage', 'service_based', 'product_based') then coalesce(p_base_amount, 0) * coalesce(p_rate, 0) / 100
    else 0
  end), 2);
$$;

create or replace function public.sync_booking_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff%rowtype;
  v_commission_type text;
  v_rate numeric(12,2);
  v_amount numeric(12,2);
  v_base numeric(12,2);
begin
  if new.status <> 'completed' or new.staff_id is null then
    return new;
  end if;

  if not public.business_has_module_access(new.business_id, 'staff_commission') then
    return new;
  end if;

  select *
  into v_staff
  from public.staff
  where id = new.staff_id
    and business_id = new.business_id
    and status = 'active';

  if not found then
    return new;
  end if;

  v_base := coalesce(new.total_amount, 0);

  select ss.commission_type, ss.commission_value
  into v_commission_type, v_rate
  from public.staff_services ss
  where ss.business_id = new.business_id
    and ss.staff_id = new.staff_id
    and ss.service_id = new.service_id
  limit 1;

  if v_commission_type is null then
    select cr.commission_type, cr.rate
    into v_commission_type, v_rate
    from public.commission_rules cr
    where cr.business_id = new.business_id
      and cr.is_active = true
      and (
        (cr.target_type = 'service' and cr.target_id = new.service_id)
        or cr.target_type = 'all'
      )
    order by
      case
        when cr.target_type = 'service' and cr.target_id = new.service_id then 1
        when cr.target_type = 'all' then 2
        else 3
      end,
      cr.created_at desc
    limit 1;
  end if;

  if v_commission_type is null then
    v_commission_type := v_staff.commission_type;
    v_rate := v_staff.commission_rate;
  end if;

  v_amount := public.calculate_commission_amount(v_commission_type, v_rate, v_base, 1);

  if v_amount > 0 then
    insert into public.commission_records (
      business_id,
      staff_id,
      source_type,
      source_id,
      commission_type,
      commission_amount,
      status,
      notes
    )
    values (
      new.business_id,
      new.staff_id,
      'booking',
      new.id,
      v_commission_type,
      v_amount,
      'pending',
      'Auto commission for completed booking'
    )
    on conflict (business_id, staff_id, source_type, source_id)
    where source_id is not null
    do update set
      commission_type = excluded.commission_type,
      commission_amount = excluded.commission_amount,
      notes = excluded.notes,
      updated_at = now()
    where public.commission_records.status = 'pending';
  end if;

  return new;
end;
$$;

create or replace function public.sync_pos_order_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff%rowtype;
  v_item public.pos_order_items%rowtype;
  v_commission_type text;
  v_rate numeric(12,2);
  v_amount numeric(12,2) := 0;
  v_line_amount numeric(12,2);
  v_line_commission numeric(12,2);
  v_note text := 'Auto commission for completed POS order';
begin
  if new.order_status <> 'completed' or new.staff_id is null then
    return new;
  end if;

  if not public.business_has_module_access(new.business_id, 'staff_commission') then
    return new;
  end if;

  select *
  into v_staff
  from public.staff
  where id = new.staff_id
    and business_id = new.business_id
    and status = 'active';

  if not found then
    return new;
  end if;

  for v_item in
    select *
    from public.pos_order_items
    where order_id = new.id
  loop
    v_commission_type := null;
    v_rate := null;
    v_line_amount := coalesce(v_item.total_price, 0);

    if v_item.item_type in ('service', 'product') and v_item.item_id is not null then
      select cr.commission_type, cr.rate
      into v_commission_type, v_rate
      from public.commission_rules cr
      where cr.business_id = new.business_id
        and cr.is_active = true
        and (
          (cr.target_type = v_item.item_type and cr.target_id = v_item.item_id)
          or cr.target_type = 'all'
        )
      order by
        case
          when cr.target_type = v_item.item_type and cr.target_id = v_item.item_id then 1
          when cr.target_type = 'all' then 2
          else 3
        end,
        cr.created_at desc
      limit 1;
    else
      select cr.commission_type, cr.rate
      into v_commission_type, v_rate
      from public.commission_rules cr
      where cr.business_id = new.business_id
        and cr.is_active = true
        and cr.target_type = 'all'
      order by cr.created_at desc
      limit 1;
    end if;

    if v_commission_type is null then
      v_commission_type := v_staff.commission_type;
      v_rate := v_staff.commission_rate;
    end if;

    v_line_commission := public.calculate_commission_amount(v_commission_type, v_rate, v_line_amount, v_item.quantity);
    v_amount := v_amount + v_line_commission;
  end loop;

  v_amount := round(v_amount, 2);

  if v_amount > 0 then
    insert into public.commission_records (
      business_id,
      staff_id,
      source_type,
      source_id,
      commission_type,
      commission_amount,
      status,
      notes
    )
    values (
      new.business_id,
      new.staff_id,
      'pos_order',
      new.id,
      'sales',
      v_amount,
      'pending',
      v_note
    )
    on conflict (business_id, staff_id, source_type, source_id)
    where source_id is not null
    do update set
      commission_amount = excluded.commission_amount,
      notes = excluded.notes,
      updated_at = now()
    where public.commission_records.status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_booking_commission_trigger on public.bookings;
create trigger sync_booking_commission_trigger
  after insert or update of status, staff_id, service_id, total_amount
  on public.bookings
  for each row
  execute function public.sync_booking_commission();

drop trigger if exists sync_pos_order_commission_trigger on public.pos_orders;
create trigger sync_pos_order_commission_trigger
  after insert or update of order_status, staff_id, total_amount
  on public.pos_orders
  for each row
  execute function public.sync_pos_order_commission();

drop policy if exists "commission records tenant or staff read" on public.commission_records;
drop policy if exists "commission records tenant write" on public.commission_records;

create policy "commission records scoped read"
on public.commission_records
for select
to authenticated
using (
  public.is_super_admin(auth.uid())
  or public.staff_owns_staff_record(staff_id)
  or (
    public.has_business_access(business_id)
    and public.user_role(auth.uid()) = 'owner'
  )
  or (
    public.has_business_access(business_id)
    and public.user_role(auth.uid()) = 'manager'
    and public.has_staff_permission(business_id, 'staff.manage')
  )
);

create policy "commission records manager write"
on public.commission_records
for all
to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.user_role(auth.uid()) in ('owner', 'manager')
    and public.has_staff_permission(business_id, 'staff.manage')
  )
)
with check (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.user_role(auth.uid()) in ('owner', 'manager')
    and public.has_staff_permission(business_id, 'staff.manage')
  )
);

grant execute on function public.staff_owns_staff_record(uuid) to authenticated;
grant execute on function public.calculate_commission_amount(text, numeric, numeric, numeric) to authenticated;
