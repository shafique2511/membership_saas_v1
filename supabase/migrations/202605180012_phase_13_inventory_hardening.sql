-- Luxantara Members - Phase 13: Inventory hardening
-- Additive/replace-only migration. Does not reset or overwrite inventory data.

alter table public.products drop constraint if exists products_business_id_sku_key;

create index if not exists products_business_branch_sku_idx
  on public.products (business_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), sku)
  where sku is not null;

create index if not exists products_business_branch_active_idx
  on public.products (business_id, branch_id, is_active);

create index if not exists products_business_category_idx
  on public.products (business_id, category)
  where category is not null;

create index if not exists suppliers_business_active_idx
  on public.suppliers (business_id, is_active);

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
  v_product public.products%rowtype;
  v_new_stock int;
  v_branch_id uuid;
begin
  if not public.has_business_access(p_business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  if not public.business_has_module_access(p_business_id, 'inventory') then
    raise exception 'Inventory module is not enabled for this business' using errcode = 'P0001';
  end if;

  if p_transaction_type not in ('stock_in', 'stock_out', 'adjustment', 'sale') then
    raise exception 'Unsupported stock movement type: %', p_transaction_type using errcode = 'P0001';
  end if;

  if p_quantity = 0 then
    raise exception 'Quantity must not be zero' using errcode = 'P0001';
  end if;

  if p_transaction_type = 'stock_in' and p_quantity < 0 then
    raise exception 'Stock in quantity must be positive' using errcode = 'P0001';
  end if;

  if p_transaction_type in ('stock_out', 'sale') and p_quantity > 0 then
    raise exception '% quantity must be negative', p_transaction_type using errcode = 'P0001';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
    and business_id = p_business_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Product is not available' using errcode = 'P0001';
  end if;

  v_branch_id := coalesce(p_branch_id, v_product.branch_id);

  if v_product.branch_id is distinct from v_branch_id then
    raise exception 'Product does not belong to the selected branch' using errcode = 'P0001';
  end if;

  v_new_stock := v_product.stock_quantity + p_quantity;
  if v_new_stock < 0 then
    raise exception 'Insufficient stock for %', v_product.name using errcode = 'P0001';
  end if;

  update public.products
  set stock_quantity = v_new_stock,
      cost_price = case
        when p_transaction_type = 'stock_in' and p_unit_cost is not null then p_unit_cost
        else cost_price
      end,
      updated_at = now()
  where id = p_product_id
    and business_id = p_business_id;

  insert into public.inventory_transactions (
    business_id,
    branch_id,
    product_id,
    transaction_type,
    quantity,
    notes,
    unit_cost,
    reference_type,
    reference_id,
    created_by
  )
  values (
    p_business_id,
    v_branch_id,
    p_product_id,
    p_transaction_type,
    p_quantity,
    p_notes,
    p_unit_cost,
    p_reference_type,
    p_reference_id,
    auth.uid()
  );
end;
$$;

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
  v_source public.products%rowtype;
  v_destination_id uuid;
begin
  if not public.has_business_access(p_business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  if not public.business_has_module_access(p_business_id, 'inventory') then
    raise exception 'Inventory module is not enabled for this business' using errcode = 'P0001';
  end if;

  if not public.business_has_module_access(p_business_id, 'multi_branch') then
    raise exception 'Multi-Branch module is required for stock transfers' using errcode = 'P0001';
  end if;

  if p_from_branch_id = p_to_branch_id then
    raise exception 'Source and destination branches must differ' using errcode = 'P0001';
  end if;

  if p_quantity <= 0 then
    raise exception 'Transfer quantity must be positive' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.branches where id = p_from_branch_id and business_id = p_business_id and status = 'active') then
    raise exception 'Source branch is not available' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.branches where id = p_to_branch_id and business_id = p_business_id and status = 'active') then
    raise exception 'Destination branch is not available' using errcode = 'P0001';
  end if;

  select *
  into v_source
  from public.products
  where id = p_product_id
    and business_id = p_business_id
    and branch_id = p_from_branch_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Source branch product is not available' using errcode = 'P0001';
  end if;

  if v_source.stock_quantity < p_quantity then
    raise exception 'Insufficient stock for %', v_source.name using errcode = 'P0001';
  end if;

  select id
  into v_destination_id
  from public.products
  where business_id = p_business_id
    and branch_id = p_to_branch_id
    and is_active = true
    and (
      (v_source.sku is not null and sku = v_source.sku)
      or (v_source.sku is null and name = v_source.name and coalesce(category, '') = coalesce(v_source.category, ''))
    )
  order by created_at
  limit 1
  for update;

  if v_destination_id is null then
    insert into public.products (
      business_id,
      branch_id,
      name,
      category,
      sku,
      barcode,
      description,
      unit,
      cost_price,
      selling_price,
      stock_quantity,
      low_stock_threshold,
      min_stock_level,
      max_stock_level,
      supplier_id,
      image_url,
      is_active
    )
    values (
      p_business_id,
      p_to_branch_id,
      v_source.name,
      v_source.category,
      v_source.sku,
      v_source.barcode,
      v_source.description,
      v_source.unit,
      v_source.cost_price,
      v_source.selling_price,
      0,
      v_source.low_stock_threshold,
      v_source.min_stock_level,
      v_source.max_stock_level,
      v_source.supplier_id,
      v_source.image_url,
      true
    )
    returning id into v_destination_id;
  end if;

  update public.products
  set stock_quantity = stock_quantity - p_quantity,
      updated_at = now()
  where id = v_source.id;

  update public.products
  set stock_quantity = stock_quantity + p_quantity,
      updated_at = now()
  where id = v_destination_id
    and business_id = p_business_id;

  insert into public.inventory_transactions (
    business_id,
    branch_id,
    product_id,
    transaction_type,
    quantity,
    notes,
    from_branch_id,
    to_branch_id,
    created_by
  )
  values
    (p_business_id, p_from_branch_id, v_source.id, 'transfer', -p_quantity, p_notes, p_from_branch_id, p_to_branch_id, auth.uid()),
    (p_business_id, p_to_branch_id, v_destination_id, 'transfer', p_quantity, p_notes, p_from_branch_id, p_to_branch_id, auth.uid());
end;
$$;

grant execute on function public.record_stock_movement(uuid, uuid, int, text, text, uuid, numeric, text, uuid) to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, int, uuid, uuid, text) to authenticated;
