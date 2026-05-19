-- Luxantara Members - Phase 12: POS checkout hardening
-- Additive/replace-only migration. Does not reset or overwrite POS data.

alter table public.pos_orders drop constraint if exists pos_orders_payment_status_check;
alter table public.pos_orders
  add constraint pos_orders_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'partial', 'refunded', 'failed'));

create index if not exists payments_pos_reference_idx
  on public.payments(reference_type, reference_id, status);
create index if not exists pos_orders_business_payment_idx
  on public.pos_orders(business_id, payment_status, order_status);

create or replace function public.complete_pos_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.pos_orders%rowtype;
  v_item public.pos_order_items%rowtype;
  v_usage public.pos_membership_usage%rowtype;
  v_plan public.membership_plans%rowtype;
  v_stock int;
  v_total_paid numeric(12,2) := 0;
  v_payment_status text := 'unpaid';
  v_counter int;
begin
  select *
  into v_order
  from public.pos_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  if not public.business_has_module_access(v_order.business_id, 'pos') then
    raise exception 'POS module is not enabled for this business' using errcode = 'P0001';
  end if;

  if v_order.order_status = 'completed' and v_order.completed_at is not null then
    return;
  end if;

  for v_item in
    select *
    from public.pos_order_items
    where order_id = p_order_id
      and item_type = 'product'
  loop
    select stock_quantity
    into v_stock
    from public.products
    where id = v_item.item_id
      and business_id = v_order.business_id
      and is_active = true
    for update;

    if v_stock is null then
      raise exception 'Product is not available: %', v_item.item_name using errcode = 'P0001';
    end if;

    if v_stock < v_item.quantity then
      raise exception 'Insufficient stock for %', v_item.item_name using errcode = 'P0001';
    end if;

    update public.products
    set stock_quantity = stock_quantity - v_item.quantity,
        updated_at = now()
    where id = v_item.item_id
      and business_id = v_order.business_id;

    insert into public.inventory_transactions (
      business_id,
      branch_id,
      product_id,
      transaction_type,
      quantity,
      notes
    )
    values (
      v_order.business_id,
      v_order.branch_id,
      v_item.item_id,
      'sale',
      -v_item.quantity,
      'POS order ' || v_order.order_number
    );
  end loop;

  for v_usage in
    select *
    from public.pos_membership_usage
    where order_id = p_order_id
  loop
    perform public.record_membership_usage(
      v_order.business_id,
      v_usage.membership_id,
      v_order.customer_id,
      null,
      v_usage.usage_type,
      case when v_usage.usage_type = 'credit' then v_usage.amount_used else 0 end,
      case when v_usage.usage_type = 'visit' then v_usage.visits_used else 0 end,
      'POS order ' || v_order.order_number
    );
  end loop;

  for v_item in
    select *
    from public.pos_order_items
    where order_id = p_order_id
      and item_type = 'membership'
      and item_id is not null
  loop
    if v_order.customer_id is null then
      raise exception 'Select a customer before selling a membership' using errcode = 'P0001';
    end if;

    for v_counter in 1..v_item.quantity loop
      select *
      into v_plan
      from public.membership_plans
      where id = v_item.item_id
        and business_id = v_order.business_id
        and is_active = true;

      if not found then
        raise exception 'Membership plan is not available: %', v_item.item_name using errcode = 'P0001';
      end if;

      insert into public.memberships (
        business_id,
        customer_id,
        plan_id,
        status,
        start_date,
        end_date,
        remaining_credit,
        remaining_visits,
        auto_renew,
        qr_code
      )
      values (
        v_order.business_id,
        v_order.customer_id,
        v_item.item_id,
        'active',
        current_date,
        current_date + v_plan.duration_days,
        v_plan.credit_amount,
        coalesce(v_plan.visit_limit, 0),
        v_plan.renewal_setting = 'auto',
        public.membership_plan_qr_code(v_order.business_id, v_order.customer_id, v_item.item_id)
      );
    end loop;
  end loop;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.payments
  where reference_type = 'pos_order'
    and reference_id = p_order_id
    and status in ('paid', 'verified');

  if v_total_paid >= v_order.total_amount then
    v_payment_status := 'paid';
  elsif v_total_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'unpaid';
  end if;

  update public.pos_orders
  set order_status = 'completed',
      payment_status = v_payment_status,
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.refund_pos_order(
  p_order_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.pos_orders%rowtype;
  v_item public.pos_order_items%rowtype;
begin
  select *
  into v_order
  from public.pos_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  if v_order.order_status = 'refunded' then
    return;
  end if;

  for v_item in
    select *
    from public.pos_order_items
    where order_id = p_order_id
      and item_type = 'product'
  loop
    update public.products
    set stock_quantity = stock_quantity + v_item.quantity,
        updated_at = now()
    where id = v_item.item_id
      and business_id = v_order.business_id;

    insert into public.inventory_transactions (
      business_id,
      branch_id,
      product_id,
      transaction_type,
      quantity,
      notes
    )
    values (
      v_order.business_id,
      v_order.branch_id,
      v_item.item_id,
      'stock_in',
      v_item.quantity,
      'Refund order ' || v_order.order_number
    );
  end loop;

  update public.payments
  set status = 'refunded',
      updated_at = now()
  where reference_type = 'pos_order'
    and reference_id = p_order_id
    and status in ('paid', 'verified');

  update public.pos_orders
  set order_status = 'refunded',
      payment_status = 'refunded',
      notes = case when p_reason is not null then concat_ws(' | ', notes, 'Refund: ' || p_reason) else notes end,
      updated_at = now()
  where id = p_order_id;
end;
$$;

grant execute on function public.complete_pos_order(uuid) to authenticated;
grant execute on function public.refund_pos_order(uuid, text) to authenticated;
