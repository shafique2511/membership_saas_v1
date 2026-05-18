-- Luxantara Members - Phase 10: POS Module

-- 1. Daily closings
create table if not exists public.daily_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  closing_date date not null,
  opened_at timestamptz,
  closed_at timestamptz,
  opening_balance numeric(12,2) not null default 0,
  closing_balance numeric(12,2) not null default 0,
  cash_sales numeric(12,2) not null default 0,
  qr_sales numeric(12,2) not null default 0,
  card_sales numeric(12,2) not null default 0,
  credit_sales numeric(12,2) not null default 0,
  points_sales numeric(12,2) not null default 0,
  total_sales numeric(12,2) not null default 0,
  total_orders int not null default 0,
  total_discounts numeric(12,2) not null default 0,
  total_refunds numeric(12,2) not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, closing_date)
);

-- 2. Order discounts
create table if not exists public.pos_discounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pos_orders(id) on delete cascade,
  discount_type text not null check (discount_type in ('percentage', 'fixed', 'membership', 'points')),
  discount_value numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  description text,
  created_at timestamptz not null default now()
);

-- 3. Membership usage in orders (prepaid credit, visit)
create table if not exists public.pos_membership_usage (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pos_orders(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  usage_type text not null check (usage_type in ('credit', 'visit', 'discount')),
  amount_used numeric(12,2) not null default 0,
  visits_used int not null default 0,
  created_at timestamptz not null default now()
);

-- 4. Points redemption in orders
create table if not exists public.pos_points_redemption (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pos_orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_redeemed int not null default 0,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- 5. Receipts
create table if not exists public.pos_receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.pos_orders(id) on delete cascade,
  receipt_number text not null,
  receipt_data jsonb not null default '{}'::jsonb,
  printed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, receipt_number)
);

-- 6. Add order_number unique per business to pos_orders if not exists
-- (Already has unique(business_id, order_number))

-- 7. Enhance pos_orders with additional columns
alter table public.pos_orders add column if not exists branch_id uuid references public.branches(id) on delete set null;
alter table public.pos_orders add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.pos_orders add column if not exists customer_name text;
alter table public.pos_orders add column if not exists customer_phone text;
alter table public.pos_orders add column if not exists points_earned int not null default 0;
alter table public.pos_orders add column if not exists notes text;
alter table public.pos_orders add column if not exists completed_at timestamptz;

-- 8. Add order_status 'draft' to check constraint
alter table public.pos_orders drop constraint if exists pos_orders_order_status_check;
alter table public.pos_orders add constraint pos_orders_order_status_check
  check (order_status in ('draft', 'open', 'completed', 'voided', 'refunded'));

-- 9. Add payment_method 'credit' and 'points' to payments check
alter table public.payments drop constraint if exists payments_payment_method_check;
alter table public.payments add constraint payments_payment_method_check
  check (payment_method in ('cash', 'qr', 'card', 'bank_transfer', 'stripe', 'billplz', 'toyyibpay', 'senangpay', 'credit', 'points'));

-- 10. RPC: complete POS order (update inventory, award points)
create or replace function public.complete_pos_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_product record;
  v_business_id uuid;
  v_customer_id uuid;
begin
  select * into v_order from public.pos_orders where id = p_order_id;
  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  v_business_id := v_order.business_id;
  v_customer_id := v_order.customer_id;

  -- Update inventory for product items
  for v_item in
    select * from public.pos_order_items
    where order_id = p_order_id and item_type = 'product'
  loop
    update public.products
    set stock_quantity = greatest(0, stock_quantity - v_item.quantity)
    where id = v_item.item_id and business_id = v_business_id;

    insert into public.inventory_transactions (business_id, product_id, transaction_type, quantity, notes)
    values (v_business_id, v_item.item_id, 'sale', -v_item.quantity, 'POS order ' || v_order.order_number);
  end loop;

  -- Mark order as completed
  update public.pos_orders
  set order_status = 'completed',
      completed_at = now()
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
  v_order record;
  v_item record;
  v_business_id uuid;
begin
  select * into v_order from public.pos_orders where id = p_order_id;
  if not found then
    raise exception 'Order not found' using errcode = 'P0001';
  end if;

  v_business_id := v_order.business_id;

  -- Restore inventory
  for v_item in
    select * from public.pos_order_items
    where order_id = p_order_id and item_type = 'product'
  loop
    update public.products
    set stock_quantity = stock_quantity + v_item.quantity
    where id = v_item.item_id and business_id = v_business_id;

    insert into public.inventory_transactions (business_id, product_id, transaction_type, quantity, notes)
    values (v_business_id, v_item.item_id, 'stock_in', v_item.quantity, 'Refund order ' || v_order.order_number);
  end loop;

  update public.pos_orders
  set order_status = 'refunded',
      notes = case when p_reason is not null then coalesce(notes, '') || ' | Refund: ' || p_reason else notes end
  where id = p_order_id;
end;
$$;

grant execute on function public.complete_pos_order(uuid) to authenticated;
grant execute on function public.refund_pos_order(uuid, text) to authenticated;

-- 11. RLS for new tables
alter table public.daily_closings enable row level security;
alter table public.pos_discounts enable row level security;
alter table public.pos_membership_usage enable row level security;
alter table public.pos_points_redemption enable row level security;
alter table public.pos_receipts enable row level security;

create policy "daily closings tenant all" on public.daily_closings
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy "pos discounts tenant all" on public.pos_discounts
  for all to authenticated using (
    exists (select 1 from public.pos_orders po where po.id = order_id and public.has_business_access(po.business_id))
  ) with check (
    exists (select 1 from public.pos_orders po where po.id = order_id and public.has_business_access(po.business_id))
  );

create policy "pos membership usage tenant all" on public.pos_membership_usage
  for all to authenticated using (
    exists (select 1 from public.pos_orders po where po.id = order_id and public.has_business_access(po.business_id))
  ) with check (
    exists (select 1 from public.pos_orders po where po.id = order_id and public.has_business_access(po.business_id))
  );

create policy "pos points redemption tenant all" on public.pos_points_redemption
  for all to authenticated using (
    exists (select 1 from public.pos_orders po where po.id = order_id and public.has_business_access(po.business_id))
  ) with check (
    exists (select 1 from public.pos_orders po where po.id = order_id and public.has_business_access(po.business_id))
  );

create policy "pos receipts tenant all" on public.pos_receipts
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

-- 12. Indexes
create index if not exists daily_closings_business_id_idx on public.daily_closings(business_id);
create index if not exists daily_closings_date_idx on public.daily_closings(closing_date);
create index if not exists pos_discounts_order_id_idx on public.pos_discounts(order_id);
create index if not exists pos_membership_usage_order_id_idx on public.pos_membership_usage(order_id);
create index if not exists pos_membership_usage_membership_id_idx on public.pos_membership_usage(membership_id);
create index if not exists pos_points_redemption_order_id_idx on public.pos_points_redemption(order_id);
create index if not exists pos_points_redemption_customer_id_idx on public.pos_points_redemption(customer_id);
create index if not exists pos_receipts_business_id_idx on public.pos_receipts(business_id);
create index if not exists pos_receipts_order_id_idx on public.pos_receipts(order_id);
create index if not exists pos_orders_completed_at_idx on public.pos_orders(completed_at) where completed_at is not null;

-- 13. Triggers
drop trigger if exists set_daily_closings_updated_at on public.daily_closings;
create trigger set_daily_closings_updated_at before update on public.daily_closings
  for each row execute function public.set_updated_at();
