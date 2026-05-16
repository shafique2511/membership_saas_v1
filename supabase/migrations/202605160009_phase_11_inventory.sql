-- Luxantara Members - Phase 11: Inventory Module

-- 1. Suppliers
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enhance products
alter table public.products add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists unit text not null default 'pcs';
alter table public.products add column if not exists min_stock_level int not null default 0 check (min_stock_level >= 0);
alter table public.products add column if not exists max_stock_level int check (max_stock_level is null or max_stock_level >= 0);
alter table public.products add column if not exists image_url text;

-- 3. Enhance inventory_transactions
alter table public.inventory_transactions add column if not exists from_branch_id uuid references public.branches(id) on delete set null;
alter table public.inventory_transactions add column if not exists to_branch_id uuid references public.branches(id) on delete set null;
alter table public.inventory_transactions add column if not exists reference_type text check (reference_type in ('pos_order', 'purchase_order', 'return', 'manual'));
alter table public.inventory_transactions add column if not exists reference_id uuid;
alter table public.inventory_transactions add column if not exists unit_cost numeric(12,2) check (unit_cost >= 0);
alter table public.inventory_transactions add column if not exists created_by uuid references auth.users(id) on delete set null;

-- 4. RPC: record stock movement
create or replace function public.record_stock_movement(
  p_business_id uuid,
  p_product_id uuid,
  p_quantity int,
  p_transaction_type text,
  p_notes text default null,
  p_branch_id uuid default null,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stock int;
begin
  update public.products
  set stock_quantity = greatest(0, stock_quantity + p_quantity)
  where id = p_product_id and business_id = p_business_id
  returning stock_quantity into v_current_stock;

  insert into public.inventory_transactions (
    business_id, branch_id, product_id, transaction_type,
    quantity, notes, unit_cost, reference_type, reference_id, created_by
  ) values (
    p_business_id, p_branch_id, p_product_id, p_transaction_type,
    p_quantity, p_notes, p_unit_cost, p_reference_type, p_reference_id, auth.uid()
  );
end;
$$;

-- 5. RPC: transfer stock between branches
create or replace function public.transfer_stock(
  p_business_id uuid,
  p_product_id uuid,
  p_quantity int,
  p_from_branch_id uuid,
  p_to_branch_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_stock int;
begin
  -- Deduct from source branch
  update public.products
  set stock_quantity = greatest(0, stock_quantity - p_quantity)
  where id = p_product_id and business_id = p_business_id and branch_id = p_from_branch_id;

  -- Add to destination branch
  update public.products
  set stock_quantity = stock_quantity + p_quantity
  where id = p_product_id and business_id = p_business_id and branch_id = p_to_branch_id;

  -- Record outgoing
  insert into public.inventory_transactions (
    business_id, branch_id, product_id, transaction_type,
    quantity, notes, from_branch_id, to_branch_id, created_by
  ) values (
    p_business_id, p_from_branch_id, p_product_id, 'transfer',
    -p_quantity, p_notes, p_from_branch_id, p_to_branch_id, auth.uid()
  );

  -- Record incoming
  insert into public.inventory_transactions (
    business_id, branch_id, product_id, transaction_type,
    quantity, notes, from_branch_id, to_branch_id, created_by
  ) values (
    p_business_id, p_to_branch_id, p_product_id, 'transfer',
    p_quantity, p_notes, p_from_branch_id, p_to_branch_id, auth.uid()
  );
end;
$$;

grant execute on function public.record_stock_movement(uuid, uuid, int, text, text, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, int, uuid, uuid, text) to authenticated;

-- 6. RLS for suppliers
alter table public.suppliers enable row level security;

create policy "suppliers tenant all" on public.suppliers
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

-- 7. Indexes
create index if not exists products_category_idx on public.products(category);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create index if not exists products_low_stock_idx on public.products(business_id, branch_id)
  where is_active = true and stock_quantity <= low_stock_threshold;
create index if not exists inventory_transactions_product_id_idx on public.inventory_transactions(product_id);
create index if not exists inventory_transactions_from_branch_idx on public.inventory_transactions(from_branch_id);
create index if not exists inventory_transactions_to_branch_idx on public.inventory_transactions(to_branch_id);
create index if not exists inventory_transactions_reference_idx on public.inventory_transactions(reference_type, reference_id);
create index if not exists suppliers_business_id_idx on public.suppliers(business_id);

-- 8. Triggers
create trigger if not exists set_suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- 9. Drop old low_stock index (created in phase 2) to replace with new one
drop index if exists public.products_low_stock_idx;
