-- Phase 32: Demo mode
-- Additive demo access layer. Does not reset production data or touch non-demo tenants.

create extension if not exists pgcrypto;

alter table public.businesses add column if not exists is_demo boolean not null default false;
alter table public.businesses add column if not exists demo_key text;
alter table public.businesses add column if not exists demo_reset_at timestamptz;

alter table public.user_profiles add column if not exists is_demo_user boolean not null default false;

create unique index if not exists businesses_demo_key_unique_idx
  on public.businesses(demo_key)
  where demo_key is not null;

create or replace function public.current_user_is_demo()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_demo_user = true
      and up.status = 'active'
  );
$$;

create or replace function public.prevent_demo_user_real_data_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_is_demo_business boolean := false;
begin
  if not public.current_user_is_demo() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'businesses' then
    v_is_demo_business := coalesce(old.is_demo, false);
  else
    v_business_id := nullif(to_jsonb(old)->>'business_id', '')::uuid;
    select coalesce(b.is_demo, false)
      into v_is_demo_business
    from public.businesses b
    where b.id = v_business_id;
  end if;

  if tg_op = 'DELETE' and not coalesce(v_is_demo_business, false) then
    raise exception 'Demo users cannot delete real business data' using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE'
    and tg_table_name = 'businesses'
    and not coalesce(v_is_demo_business, false)
    and coalesce(new.status, '') = 'deleted' then
    raise exception 'Demo users cannot delete real business data' using errcode = 'P0001';
  end if;

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
    'businesses',
    'branches',
    'customers',
    'staff',
    'services',
    'bookable_resources',
    'bookings',
    'membership_plans',
    'memberships',
    'products',
    'inventory_transactions',
    'pos_orders',
    'payments',
    'rewards',
    'loyalty_transactions',
    'notification_templates',
    'marketing_campaigns',
    'promo_codes',
    'customer_segments',
    'reviews'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists prevent_demo_real_delete_%I on public.%I', v_table, v_table);
      execute format(
        'create trigger prevent_demo_real_delete_%I before delete on public.%I for each row execute function public.prevent_demo_user_real_data_delete()',
        v_table,
        v_table
      );
    end if;
  end loop;

  if to_regclass('public.businesses') is not null then
    drop trigger if exists prevent_demo_real_business_soft_delete on public.businesses;
    create trigger prevent_demo_real_business_soft_delete
      before update of status on public.businesses
      for each row
      execute function public.prevent_demo_user_real_data_delete();
  end if;
end $$;

create or replace function public.seed_phase32_demo_mode()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber_biz_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_coffee_biz_id uuid := 'a0000000-0000-0000-0000-000000000002';
  v_enterprise_pkg_id uuid;
  v_barber_branch_id uuid := 'b0000000-0000-0000-0000-000000000001';
  v_coffee_branch_id uuid := 'b0000000-0000-0000-0000-000000000003';
  v_barber_staff_id uuid := '50000000-0000-0000-0000-000000000001';
  v_coffee_staff_id uuid := '50000000-0000-0000-0000-000000000004';
  v_barber_customer_id uuid := 'c0000000-0000-0000-0000-000000000001';
  v_coffee_customer_id uuid := 'c0000000-0000-0000-0000-000000000004';
  v_barber_service_id uuid := '60000000-0000-0000-0000-000000000001';
  v_coffee_service_id uuid := '60000000-0000-0000-0000-000000000004';
  v_barber_product_id uuid := '90000000-0000-0000-0000-000000000001';
  v_coffee_product_id uuid := '90000000-0000-0000-0000-000000000003';
  v_barber_plan_id uuid := 'a2000000-0000-0000-0000-000000000001';
  v_coffee_plan_id uuid := 'a2000000-0000-0000-0000-000000000003';
  v_barber_booking_id uuid := 'b1000000-0000-0000-0000-000000000004';
  v_coffee_booking_id uuid := 'b1000000-0000-0000-0000-000000000006';
  v_barber_order_id uuid := 'c1000000-0000-0000-0000-000000000001';
  v_coffee_order_id uuid := 'c1000000-0000-0000-0000-000000000002';
begin
  select id into v_enterprise_pkg_id
  from public.packages
  where slug = 'enterprise'
  limit 1;

  insert into public.businesses (id, name, business_type, phone, email, address, timezone, status, is_demo, demo_key, demo_reset_at)
  values
    (v_barber_biz_id, 'Demo Barber Shop', 'barber_shop', '+60123456789', 'barber_owner@demo.com', '12 Demo Street, Kuala Lumpur', 'Asia/Kuala_Lumpur', 'active', true, 'demo_barber_shop', now()),
    (v_coffee_biz_id, 'Demo Coffee Shop', 'coffee_shop', '+60198765432', 'coffee_owner@demo.com', '45 Demo Avenue, Kuala Lumpur', 'Asia/Kuala_Lumpur', 'active', true, 'demo_coffee_shop', now())
  on conflict (id) do update set
    name = excluded.name,
    business_type = excluded.business_type,
    status = 'active',
    is_demo = true,
    demo_key = excluded.demo_key,
    demo_reset_at = now(),
    updated_at = now();

  insert into public.business_subscriptions (business_id, package_id, status, billing_cycle, start_date, trial_ends_at, next_billing_date)
  select b.id, v_enterprise_pkg_id, 'trial', 'monthly', current_date, now() + interval '30 days', current_date + interval '30 days'
  from public.businesses b
  where b.id in (v_barber_biz_id, v_coffee_biz_id)
    and v_enterprise_pkg_id is not null
  on conflict do nothing;

  insert into public.business_module_access (business_id, module_key, access_level, source, is_enabled, limit_config)
  select b.id, m.module_key, 'unlimited', 'manual', true, '{}'::jsonb
  from public.businesses b
  cross join public.modules m
  where b.id in (v_barber_biz_id, v_coffee_biz_id)
    and m.is_active = true
  on conflict (business_id, module_key, source) do update set
    access_level = 'unlimited',
    is_enabled = true,
    limit_config = '{}'::jsonb,
    updated_at = now();

  begin
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_user_meta_data, created_at, updated_at)
    values
      ('a1000000-0000-0000-0000-000000000001', 'barber_owner@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Demo Barber Owner","role":"owner","business_name":"Demo Barber Shop","business_type":"barber_shop"}'::jsonb, now(), now()),
      ('a1000000-0000-0000-0000-000000000002', 'coffee_owner@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Demo Coffee Owner","role":"owner","business_name":"Demo Coffee Shop","business_type":"coffee_shop"}'::jsonb, now(), now())
    on conflict (id) do update set
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = now();

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    select id, id, jsonb_build_object('sub', id, 'email', email), 'email', email, now(), now(), now()
    from auth.users
    where email in ('barber_owner@demo.com', 'coffee_owner@demo.com')
    on conflict (provider_id, provider) do nothing;
  exception when others then
    raise notice 'Demo auth user creation skipped. Create demo users manually if sign-in fails: %', SQLERRM;
  end;

  insert into public.user_profiles (id, business_id, branch_id, full_name, email, role, status, is_demo_user)
  select u.id,
         case when u.email = 'barber_owner@demo.com' then v_barber_biz_id else v_coffee_biz_id end,
         null,
         u.raw_user_meta_data->>'full_name',
         u.email,
         'owner',
         'active',
         true
  from auth.users u
  where u.email in ('barber_owner@demo.com', 'coffee_owner@demo.com')
  on conflict (id) do update set
    business_id = excluded.business_id,
    full_name = excluded.full_name,
    role = 'owner',
    status = 'active',
    is_demo_user = true,
    updated_at = now();

  insert into public.branches (id, business_id, name, address, phone, is_main, opening_hours, status)
  values
    (v_barber_branch_id, v_barber_biz_id, 'Demo Barber Main', '12 Demo Street, Kuala Lumpur', '+60123456789', true, '{"monday":{"open":"09:00","close":"19:00"},"tuesday":{"open":"09:00","close":"19:00"},"wednesday":{"open":"09:00","close":"19:00"},"thursday":{"open":"09:00","close":"19:00"},"friday":{"open":"09:00","close":"19:00"},"saturday":{"open":"09:00","close":"18:00"}}'::jsonb, 'active'),
    (v_coffee_branch_id, v_coffee_biz_id, 'Demo Coffee Main', '45 Demo Avenue, Kuala Lumpur', '+60198765432', true, '{"monday":{"open":"07:00","close":"22:00"},"tuesday":{"open":"07:00","close":"22:00"},"wednesday":{"open":"07:00","close":"22:00"},"thursday":{"open":"07:00","close":"22:00"},"friday":{"open":"07:00","close":"23:00"},"saturday":{"open":"08:00","close":"23:00"}}'::jsonb, 'active')
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    is_main = true,
    status = 'active',
    updated_at = now();

  insert into public.staff (id, business_id, branch_id, full_name, phone, email, role, commission_rate, status)
  values
    (v_barber_staff_id, v_barber_biz_id, v_barber_branch_id, 'Demo Barber Ahmad', '+60111111111', 'staff1@demo.com', 'barber', 30, 'active'),
    (v_coffee_staff_id, v_coffee_biz_id, v_coffee_branch_id, 'Demo Barista Mei', '+60122222221', 'staff1_coffee@demo.com', 'barista', 0, 'active')
  on conflict (id) do update set
    full_name = excluded.full_name,
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    status = 'active',
    updated_at = now();

  insert into public.customers (id, business_id, branch_id, full_name, phone, email, points_balance, total_spent, visit_count, no_show_count, status)
  values
    (v_barber_customer_id, v_barber_biz_id, v_barber_branch_id, 'Demo Barber Customer', '+60123450001', 'customer1@demo.com', 450, 1275.00, 15, 0, 'active'),
    (v_coffee_customer_id, v_coffee_biz_id, v_coffee_branch_id, 'Demo Coffee Customer', '+60123450004', 'customer4@demo.com', 180, 540.00, 25, 0, 'active')
  on conflict (id) do update set
    full_name = excluded.full_name,
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    status = 'active',
    updated_at = now();

  insert into public.services (id, business_id, branch_id, name, category, description, duration_minutes, price, is_bookable, is_active)
  values
    (v_barber_service_id, v_barber_biz_id, v_barber_branch_id, 'Haircut + Beard', 'Grooming', 'Demo best-selling barber service.', 45, 45.00, true, true),
    (v_coffee_service_id, v_coffee_biz_id, v_coffee_branch_id, 'Coffee Tasting Session', 'Experience', 'Demo bookable coffee experience.', 60, 30.00, true, true)
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    is_active = true,
    updated_at = now();

  insert into public.products (id, business_id, branch_id, name, sku, category, selling_price, cost_price, stock_quantity, low_stock_threshold, is_active)
  values
    (v_barber_product_id, v_barber_biz_id, v_barber_branch_id, 'Demo Pomade', 'DEMO-BARBER-POMADE', 'Hair Product', 35.00, 15.00, 40, 10, true),
    (v_coffee_product_id, v_coffee_biz_id, v_coffee_branch_id, 'Demo Signature Latte', 'DEMO-COFFEE-LATTE', 'Drink', 12.00, 4.00, 120, 20, true)
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    is_active = true,
    updated_at = now();

  insert into public.membership_plans (id, business_id, name, plan_type, description, price, duration_days, visit_limit, points_bonus, is_active)
  values
    (v_barber_plan_id, v_barber_biz_id, 'Demo Grooming Pass', 'visit_package', 'Demo 5-visit haircut package.', 180.00, 90, 5, 200, true),
    (v_coffee_plan_id, v_coffee_biz_id, 'Demo Coffee Club', 'prepaid_credit', 'Demo prepaid coffee membership.', 100.00, 60, null, 100, true)
  on conflict (id) do update set
    name = excluded.name,
    business_id = excluded.business_id,
    is_active = true,
    updated_at = now();

  insert into public.memberships (id, business_id, customer_id, plan_id, status, start_date, end_date, remaining_visits, remaining_credit, auto_renew, qr_code)
  values
    ('a3000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_customer_id, v_barber_plan_id, 'active', current_date - interval '10 days', current_date + interval '80 days', 4, 0, false, 'DEMO-BARBER-MEMBER'),
    ('a3000000-0000-0000-0000-000000000003', v_coffee_biz_id, v_coffee_customer_id, v_coffee_plan_id, 'active', current_date - interval '5 days', current_date + interval '55 days', 0, 72.00, false, 'DEMO-COFFEE-MEMBER')
  on conflict (id) do update set
    status = 'active',
    end_date = excluded.end_date,
    updated_at = now();

  insert into public.bookings (id, business_id, branch_id, customer_id, staff_id, service_id, booking_type, booking_date, start_time, end_time, status, total_amount, payment_status)
  values
    (v_barber_booking_id, v_barber_biz_id, v_barber_branch_id, v_barber_customer_id, v_barber_staff_id, v_barber_service_id, 'appointment', current_date, '10:00', '10:45', 'completed', 45.00, 'paid'),
    (v_coffee_booking_id, v_coffee_biz_id, v_coffee_branch_id, v_coffee_customer_id, v_coffee_staff_id, v_coffee_service_id, 'event', current_date, '15:00', '16:00', 'confirmed', 30.00, 'unpaid')
  on conflict (id) do update set
    booking_date = excluded.booking_date,
    status = excluded.status,
    updated_at = now();

  insert into public.pos_orders (id, business_id, branch_id, customer_id, staff_id, order_number, subtotal, discount_amount, tax_amount, total_amount, payment_status, order_status, completed_at)
  values
    (v_barber_order_id, v_barber_biz_id, v_barber_branch_id, v_barber_customer_id, v_barber_staff_id, 'DEMO-BARBER-POS-001', 80.00, 5.00, 0, 75.00, 'paid', 'completed', now() - interval '1 hour'),
    (v_coffee_order_id, v_coffee_biz_id, v_coffee_branch_id, v_coffee_customer_id, v_coffee_staff_id, 'DEMO-COFFEE-POS-001', 36.00, 0.00, 0, 36.00, 'paid', 'completed', now() - interval '2 hours')
  on conflict (id) do update set
    order_number = excluded.order_number,
    subtotal = excluded.subtotal,
    total_amount = excluded.total_amount,
    payment_status = 'paid',
    order_status = 'completed',
    completed_at = excluded.completed_at,
    updated_at = now();

  insert into public.pos_order_items (id, order_id, item_type, item_id, item_name, quantity, unit_price, total_price)
  values
    ('c2000000-0000-0000-0000-000000000001', v_barber_order_id, 'service', v_barber_service_id, 'Haircut + Beard', 1, 45.00, 45.00),
    ('c2000000-0000-0000-0000-000000000002', v_barber_order_id, 'product', v_barber_product_id, 'Demo Pomade', 1, 35.00, 35.00),
    ('c2000000-0000-0000-0000-000000000003', v_coffee_order_id, 'product', v_coffee_product_id, 'Demo Signature Latte', 3, 12.00, 36.00)
  on conflict (id) do update set
    item_id = excluded.item_id,
    item_name = excluded.item_name,
    quantity = excluded.quantity,
    unit_price = excluded.unit_price,
    total_price = excluded.total_price;

  insert into public.payments (id, business_id, customer_id, reference_type, reference_id, payment_method, amount, status, paid_at, transaction_id)
  values
    ('d0000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_customer_id, 'booking', v_barber_booking_id, 'cash', 45.00, 'paid', now(), 'DEMO-CASH-001'),
    ('d0000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_customer_id, 'pos_order', v_barber_order_id, 'card', 75.00, 'paid', now(), 'DEMO-CARD-001'),
    ('d0000000-0000-0000-0000-000000000003', v_coffee_biz_id, v_coffee_customer_id, 'pos_order', v_coffee_order_id, 'qr', 36.00, 'paid', now(), 'DEMO-QR-001')
  on conflict (id) do update set
    amount = excluded.amount,
    status = 'paid',
    paid_at = excluded.paid_at,
    updated_at = now();

  insert into public.loyalty_transactions (id, business_id, customer_id, transaction_type, points, description, reference_type, balance_after)
  values
    ('e1000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_customer_id, 'earn', 120, 'Demo points from completed visit', 'payment', 450),
    ('e1000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_customer_id, 'earn', 36, 'Demo points from coffee order', 'payment', 180)
  on conflict (id) do update set
    points = excluded.points,
    description = excluded.description;

  insert into public.rewards (id, business_id, name, description, reward_type, points_required, discount_amount, free_item, is_active)
  values
    ('e2000000-0000-0000-0000-000000000001', v_barber_biz_id, 'Demo RM5 Discount', 'Demo reward for sales walkthroughs.', 'discount', 100, 5.00, null, true),
    ('e2000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'Demo Free Latte', 'Demo reward for coffee customers.', 'free_item', 100, null, 'Signature Latte', true)
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    is_active = true,
    updated_at = now();

  update public.user_profiles
  set is_demo_user = true,
      updated_at = now()
  where business_id in (v_barber_biz_id, v_coffee_biz_id)
     or email in ('barber_owner@demo.com', 'coffee_owner@demo.com', 'staff1@demo.com', 'staff1_coffee@demo.com', 'customer1@demo.com', 'customer4@demo.com');

  update public.businesses
  set demo_reset_at = now()
  where id in (v_barber_biz_id, v_coffee_biz_id);
end;
$$;

create or replace function public.reset_demo_businesses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    raise exception 'Only platform admins can reset demo data' using errcode = 'P0001';
  end if;

  perform public.seed_phase32_demo_mode();
end;
$$;

select public.seed_phase32_demo_mode();

grant execute on function public.current_user_is_demo() to authenticated;
grant execute on function public.seed_phase32_demo_mode() to authenticated;
grant execute on function public.reset_demo_businesses() to authenticated;
