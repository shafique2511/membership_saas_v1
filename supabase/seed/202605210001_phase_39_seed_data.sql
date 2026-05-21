-- Luxantara Members - Phase 39: Realistic seed data
-- Safe, idempotent demo seed. Run after all migrations.
-- This refreshes only deterministic demo records and does not reset production data.

create extension if not exists pgcrypto;

do $$
declare
  v_barber_biz_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_coffee_biz_id uuid := 'a0000000-0000-0000-0000-000000000002';
  v_barber_branch_id uuid := 'b0000000-0000-0000-0000-000000000001';
  v_barber_branch_2_id uuid := 'b0000000-0000-0000-0000-000000000002';
  v_coffee_branch_id uuid := 'b0000000-0000-0000-0000-000000000003';
  v_coffee_event_branch_id uuid := 'b0000000-0000-0000-0000-000000000004';
  v_enterprise_pkg_id uuid;
begin
  -- 1. Packages
  insert into public.packages (name, slug, description, monthly_price, yearly_price, setup_fee, is_active, sort_order)
  values
    ('Starter', 'starter', 'Core booking, customer portal, and basic reports for small teams.', 99, 990, 0, true, 10),
    ('Growth', 'growth', 'Membership, loyalty, payments, and higher booking limits for growing businesses.', 199, 1990, 0, true, 20),
    ('Pro', 'pro', 'POS, inventory, staff commission, notifications, and pro reports.', 399, 3990, 0, true, 30),
    ('Business Suite', 'business_suite', 'Advanced operations, marketing, multi-branch basics, and higher limits.', 699, 6990, 0, true, 40),
    ('Enterprise', 'enterprise', 'All modules, white label, AI assistant, custom limits, and priority support.', 0, 0, 0, true, 50)
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    monthly_price = excluded.monthly_price,
    yearly_price = excluded.yearly_price,
    setup_fee = excluded.setup_fee,
    is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

  -- 2. Modules
  insert into public.modules (module_key, module_name, description, category, is_core, is_active, sort_order)
  values
    ('core', 'Core Business System', 'Business profile, customers, settings, dashboard, and tenant controls.', 'platform', true, true, 10),
    ('data_ownership_backup', 'Data Ownership & Backup', 'Business data export, backup, migration, and shutdown policy tools.', 'governance', true, true, 15),
    ('booking', 'Booking Module', 'Appointments, tables, rooms, walk-ins, deposits, and public booking.', 'operations', false, true, 20),
    ('membership', 'Membership Module', 'Membership plans, prepaid credits, packages, renewals, and member benefits.', 'membership', false, true, 30),
    ('loyalty', 'Loyalty & Rewards Module', 'Points, rewards, birthday perks, referrals, and transaction history.', 'membership', false, true, 40),
    ('pos', 'POS Module', 'Checkout for products, services, memberships, discounts, payments, and receipts.', 'sales', false, true, 50),
    ('inventory', 'Inventory Module', 'Products, stock movement, suppliers, low-stock alerts, and branch transfers.', 'operations', false, true, 60),
    ('staff_commission', 'Staff & Commission Module', 'Staff profiles, schedules, assigned services, performance, and commissions.', 'team', false, true, 70),
    ('payment', 'Payment Module', 'Payment tracking, proofs, invoices, receipts, refunds, and gateway-ready records.', 'finance', false, true, 80),
    ('notification', 'Notification Module', 'Email, WhatsApp, Telegram, reminders, templates, broadcasts, and logs.', 'communication', false, true, 90),
    ('reports', 'Reports Module', 'Sales, bookings, members, customers, loyalty, staff, inventory, payment, and profit reports.', 'analytics', false, true, 100),
    ('marketing', 'Marketing Module', 'Promo codes, campaigns, customer segments, referrals, and broadcast reporting.', 'growth', false, true, 110),
    ('multi_branch', 'Multi-Branch Module', 'Branch dashboards, branch staff, branch bookings, stock transfers, and comparisons.', 'operations', false, true, 120),
    ('customer_portal', 'Customer Portal Module', 'Mobile-first public page, login, booking, membership, rewards, profile, and history.', 'customer', false, true, 130),
    ('white_label', 'White Label Module', 'Custom logo, brand color, custom domain readiness, and reseller branding.', 'enterprise', false, true, 140),
    ('ai_assistant', 'AI Assistant', 'Premium AI assistant for sales summaries, insights, campaigns, and business explanations.', 'automation', false, true, 150)
  on conflict (module_key) do update set
    module_name = excluded.module_name,
    description = excluded.description,
    category = excluded.category,
    is_core = excluded.is_core,
    is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

  -- 3. Package modules
  with package_rules(package_slug, module_key, access_level, limit_config, is_enabled) as (
    values
      ('starter', 'core', 'unlimited', '{"customers":300,"staff":2,"branches":1}'::jsonb, true),
      ('starter', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
      ('starter', 'booking', 'basic', '{"bookings_per_month":100}'::jsonb, true),
      ('starter', 'customer_portal', 'basic', '{}'::jsonb, true),
      ('starter', 'reports', 'basic', '{}'::jsonb, true),
      ('growth', 'core', 'unlimited', '{"customers":1000,"staff":5,"branches":1}'::jsonb, true),
      ('growth', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
      ('growth', 'booking', 'pro', '{"bookings_per_month":300}'::jsonb, true),
      ('growth', 'membership', 'basic', '{}'::jsonb, true),
      ('growth', 'loyalty', 'basic', '{}'::jsonb, true),
      ('growth', 'payment', 'basic', '{}'::jsonb, true),
      ('growth', 'customer_portal', 'pro', '{}'::jsonb, true),
      ('growth', 'reports', 'basic', '{}'::jsonb, true),
      ('pro', 'core', 'unlimited', '{"customers":5000,"staff":15,"branches":2}'::jsonb, true),
      ('pro', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
      ('pro', 'booking', 'pro', '{"bookings_per_month":1000}'::jsonb, true),
      ('pro', 'membership', 'pro', '{}'::jsonb, true),
      ('pro', 'loyalty', 'pro', '{}'::jsonb, true),
      ('pro', 'pos', 'basic', '{}'::jsonb, true),
      ('pro', 'inventory', 'basic', '{}'::jsonb, true),
      ('pro', 'staff_commission', 'basic', '{}'::jsonb, true),
      ('pro', 'payment', 'pro', '{}'::jsonb, true),
      ('pro', 'notification', 'basic', '{"whatsapp_messages_per_month":500}'::jsonb, true),
      ('pro', 'customer_portal', 'pro', '{}'::jsonb, true),
      ('pro', 'reports', 'pro', '{}'::jsonb, true),
      ('business_suite', 'core', 'unlimited', '{"customers":20000,"staff":50,"branches":5}'::jsonb, true),
      ('business_suite', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
      ('business_suite', 'booking', 'advanced', '{"bookings_per_month":5000}'::jsonb, true),
      ('business_suite', 'membership', 'advanced', '{}'::jsonb, true),
      ('business_suite', 'loyalty', 'advanced', '{}'::jsonb, true),
      ('business_suite', 'pos', 'pro', '{}'::jsonb, true),
      ('business_suite', 'inventory', 'pro', '{}'::jsonb, true),
      ('business_suite', 'staff_commission', 'pro', '{}'::jsonb, true),
      ('business_suite', 'payment', 'pro', '{}'::jsonb, true),
      ('business_suite', 'notification', 'pro', '{"whatsapp_messages_per_month":2000}'::jsonb, true),
      ('business_suite', 'customer_portal', 'advanced', '{}'::jsonb, true),
      ('business_suite', 'reports', 'advanced', '{}'::jsonb, true),
      ('business_suite', 'marketing', 'pro', '{}'::jsonb, true),
      ('business_suite', 'multi_branch', 'basic', '{}'::jsonb, true),
      ('enterprise', 'core', 'unlimited', '{"custom_limits":true}'::jsonb, true),
      ('enterprise', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'booking', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'membership', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'loyalty', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'pos', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'inventory', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'staff_commission', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'payment', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'notification', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'reports', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'marketing', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'multi_branch', 'advanced', '{}'::jsonb, true),
      ('enterprise', 'customer_portal', 'unlimited', '{}'::jsonb, true),
      ('enterprise', 'white_label', 'unlimited', '{"custom_domain_ready":true}'::jsonb, true),
      ('enterprise', 'ai_assistant', 'unlimited', '{}'::jsonb, true)
  )
  insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
  select p.id, m.id, pr.access_level, pr.limit_config, pr.is_enabled
  from package_rules pr
  join public.packages p on p.slug = pr.package_slug
  join public.modules m on m.module_key = pr.module_key
  on conflict (package_id, module_id) do update set
    access_level = excluded.access_level,
    limit_config = excluded.limit_config,
    is_enabled = excluded.is_enabled;

  select id into v_enterprise_pkg_id from public.packages where slug = 'enterprise' limit 1;

  -- 4 & 5. Demo businesses
  insert into public.businesses (
    id, name, slug, business_type, phone, whatsapp, email, address, timezone, status,
    is_demo, demo_key, demo_reset_at, setup_completed_at, setup_step, setup_metadata
  )
  values
    (
      v_barber_biz_id, 'Demo Barber Shop', 'demo-barber-shop', 'barber_shop',
      '+60123456789', '+60123456789', 'barber_owner@demo.com', '12 Demo Street, Kuala Lumpur',
      'Asia/Kuala_Lumpur', 'active', true, 'demo_barber_shop', now(), now(), 'completed',
      '{"seed_phase":"39","industry":"barber"}'::jsonb
    ),
    (
      v_coffee_biz_id, 'Demo Coffee Shop', 'demo-coffee-shop', 'coffee_shop',
      '+60198765432', '+60198765432', 'coffee_owner@demo.com', '45 Demo Avenue, Kuala Lumpur',
      'Asia/Kuala_Lumpur', 'active', true, 'demo_coffee_shop', now(), now(), 'completed',
      '{"seed_phase":"39","industry":"coffee"}'::jsonb
    )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    business_type = excluded.business_type,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    email = excluded.email,
    address = excluded.address,
    status = 'active',
    is_demo = true,
    demo_key = excluded.demo_key,
    demo_reset_at = now(),
    setup_completed_at = coalesce(public.businesses.setup_completed_at, excluded.setup_completed_at),
    setup_step = 'completed',
    setup_metadata = coalesce(public.businesses.setup_metadata, '{}'::jsonb) || excluded.setup_metadata,
    updated_at = now();

  insert into public.business_subscriptions (id, business_id, package_id, status, billing_cycle, start_date, trial_ends_at, next_billing_date)
  values
    ('a5000000-0000-0000-0000-000000000001', v_barber_biz_id, v_enterprise_pkg_id, 'trial', 'monthly', current_date - 14, now() + interval '30 days', current_date + 30),
    ('a5000000-0000-0000-0000-000000000002', v_coffee_biz_id, v_enterprise_pkg_id, 'trial', 'monthly', current_date - 10, now() + interval '30 days', current_date + 30)
  on conflict (id) do update set
    package_id = excluded.package_id,
    status = 'trial',
    billing_cycle = excluded.billing_cycle,
    trial_ends_at = excluded.trial_ends_at,
    next_billing_date = excluded.next_billing_date,
    updated_at = now();

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

  -- 6. Demo branches
  insert into public.branches (id, business_id, name, address, phone, email, is_main, opening_hours, status)
  values
    (v_barber_branch_id, v_barber_biz_id, 'Demo Barber Main', '12 Demo Street, Kuala Lumpur', '+60123456789', 'barber_owner@demo.com', true, '{"monday":{"open":"09:00","close":"19:00"},"tuesday":{"open":"09:00","close":"19:00"},"wednesday":{"open":"09:00","close":"19:00"},"thursday":{"open":"09:00","close":"19:00"},"friday":{"open":"09:00","close":"19:00"},"saturday":{"open":"09:00","close":"18:00"},"sunday":{"open":"10:00","close":"17:00"}}'::jsonb, 'active'),
    (v_barber_branch_2_id, v_barber_biz_id, 'Demo Barber Express', '88 Demo Lane, Petaling Jaya', '+60123456780', 'barber_pj@demo.com', false, '{"monday":{"open":"10:00","close":"20:00"},"tuesday":{"open":"10:00","close":"20:00"},"wednesday":{"open":"10:00","close":"20:00"},"thursday":{"open":"10:00","close":"20:00"},"friday":{"open":"10:00","close":"20:00"},"saturday":{"open":"09:00","close":"18:00"}}'::jsonb, 'active'),
    (v_coffee_branch_id, v_coffee_biz_id, 'Demo Coffee Main', '45 Demo Avenue, Kuala Lumpur', '+60198765432', 'coffee_owner@demo.com', true, '{"monday":{"open":"07:00","close":"22:00"},"tuesday":{"open":"07:00","close":"22:00"},"wednesday":{"open":"07:00","close":"22:00"},"thursday":{"open":"07:00","close":"22:00"},"friday":{"open":"07:00","close":"23:00"},"saturday":{"open":"08:00","close":"23:00"},"sunday":{"open":"08:00","close":"22:00"}}'::jsonb, 'active'),
    (v_coffee_event_branch_id, v_coffee_biz_id, 'Demo Coffee Event Space', '45 Demo Avenue Level 2, Kuala Lumpur', '+60198765433', 'events@demo-coffee.test', false, '{"monday":{"open":"09:00","close":"22:00"},"tuesday":{"open":"09:00","close":"22:00"},"wednesday":{"open":"09:00","close":"22:00"},"thursday":{"open":"09:00","close":"22:00"},"friday":{"open":"09:00","close":"23:00"},"saturday":{"open":"09:00","close":"23:00"}}'::jsonb, 'active')
  on conflict (id) do update set
    business_id = excluded.business_id,
    name = excluded.name,
    address = excluded.address,
    phone = excluded.phone,
    email = excluded.email,
    is_main = excluded.is_main,
    opening_hours = excluded.opening_hours,
    status = 'active',
    updated_at = now();

  -- 7. Demo staff
  insert into public.staff (id, business_id, branch_id, full_name, phone, email, role, commission_rate, working_hours, off_days, status)
  values
    ('50000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'Ahmad Barber', '+60111111111', 'staff1@demo.com', 'Senior Barber', 30, '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"17:00"}}'::jsonb, '["sunday"]'::jsonb, 'active'),
    ('50000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'Siti Grooming', '+60111111112', 'staff2@demo.com', 'Barber', 25, '{"monday":{"start":"10:00","end":"19:00"},"tuesday":{"start":"10:00","end":"19:00"},"wednesday":{"start":"10:00","end":"19:00"},"thursday":{"start":"10:00","end":"19:00"},"friday":{"start":"10:00","end":"19:00"},"saturday":{"start":"10:00","end":"18:00"}}'::jsonb, '["sunday"]'::jsonb, 'active'),
    ('50000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_branch_2_id, 'Raj Express', '+60111111113', 'staff3@demo.com', 'Barber', 20, '{"monday":{"start":"11:00","end":"20:00"},"tuesday":{"start":"11:00","end":"20:00"},"wednesday":{"start":"11:00","end":"20:00"},"thursday":{"start":"11:00","end":"20:00"},"friday":{"start":"11:00","end":"20:00"}}'::jsonb, '["sunday"]'::jsonb, 'active'),
    ('50000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_branch_id, 'Mei Barista', '+60122222221', 'staff1_coffee@demo.com', 'Head Barista', 0, '{"monday":{"start":"07:00","end":"15:00"},"tuesday":{"start":"07:00","end":"15:00"},"wednesday":{"start":"07:00","end":"15:00"},"thursday":{"start":"07:00","end":"15:00"},"friday":{"start":"07:00","end":"15:00"},"saturday":{"start":"08:00","end":"14:00"}}'::jsonb, '["sunday"]'::jsonb, 'active'),
    ('50000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_branch_id, 'Priya Cafe Lead', '+60122222222', 'staff2_coffee@demo.com', 'Cafe Lead', 0, '{"monday":{"start":"14:00","end":"22:00"},"tuesday":{"start":"14:00","end":"22:00"},"wednesday":{"start":"14:00","end":"22:00"},"thursday":{"start":"14:00","end":"22:00"},"friday":{"start":"14:00","end":"23:00"},"saturday":{"start":"14:00","end":"23:00"}}'::jsonb, '["sunday"]'::jsonb, 'active')
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    role = excluded.role,
    commission_rate = excluded.commission_rate,
    working_hours = excluded.working_hours,
    off_days = excluded.off_days,
    status = 'active',
    updated_at = now();

  -- 8. Demo customers
  insert into public.customers (id, business_id, branch_id, full_name, phone, email, birthday, points_balance, total_spent, visit_count, no_show_count, status)
  values
    ('c0000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'John Tan', '+60123450001', 'customer1@demo.com', '1990-05-15', 450, 1275.00, 15, 0, 'active'),
    ('c0000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'Sarah Lim', '+60123450002', 'customer2@demo.com', '1995-08-22', 210, 680.00, 8, 1, 'active'),
    ('c0000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_branch_2_id, 'David Chong', '+60123450003', 'customer3@demo.com', '1988-12-03', 60, 320.00, 4, 0, 'active'),
    ('c0000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_branch_id, 'Lisa Wong', '+60123450004', 'customer4@demo.com', '1992-03-10', 180, 540.00, 25, 0, 'active'),
    ('c0000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_branch_id, 'Adam Malik', '+60123450005', 'customer5@demo.com', '1997-07-19', 90, 210.00, 12, 2, 'active'),
    ('c0000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_event_branch_id, 'Nadia Event Planner', '+60123450006', 'customer6@demo.com', '1989-11-05', 320, 980.00, 6, 0, 'active')
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    birthday = excluded.birthday,
    points_balance = excluded.points_balance,
    total_spent = excluded.total_spent,
    visit_count = excluded.visit_count,
    no_show_count = excluded.no_show_count,
    status = 'active',
    updated_at = now();

  -- 9. Demo services
  insert into public.services (id, business_id, branch_id, name, category, description, duration_minutes, price, is_bookable, is_active)
  values
    ('5c000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'Haircut', 'Grooming', 'Classic men haircut with finishing style.', 30, 25.00, true, true),
    ('5c000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'Haircut + Beard', 'Grooming', 'Haircut with beard trim and shape-up.', 45, 40.00, true, true),
    ('5c000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_branch_id, 'Kids Haircut', 'Grooming', 'Quick child-friendly haircut.', 25, 20.00, true, true),
    ('5c000000-0000-0000-0000-000000000004', v_barber_biz_id, v_barber_branch_id, 'Hair Wash', 'Grooming', 'Hair wash and light scalp massage.', 15, 10.00, true, true),
    ('5c000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_branch_id, 'Table Reservation', 'Dining', 'Reserve a table during peak hours.', 60, 0.00, true, true),
    ('5c000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_event_branch_id, 'Private Room Booking', 'Events', 'Private room reservation for meetings.', 120, 50.00, true, true)
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    duration_minutes = excluded.duration_minutes,
    price = excluded.price,
    is_bookable = true,
    is_active = true,
    updated_at = now();

  -- 10. Demo resources
  insert into public.bookable_resources (id, business_id, branch_id, name, resource_type, capacity, description, status)
  values
    ('60000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'Chair 1', 'barber_chair', 1, 'Main barber chair for appointments.', 'active'),
    ('60000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'Chair 2', 'barber_chair', 1, 'Second barber chair for walk-ins.', 'active'),
    ('60000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_branch_id, 'Table for 2', 'table', 2, 'Cozy table for two.', 'active'),
    ('60000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_branch_id, 'Table for 4', 'table', 4, 'Comfortable table for small groups.', 'active'),
    ('60000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_branch_id, 'Private Room', 'room', 6, 'Private room for meetings or birthdays.', 'active'),
    ('60000000-0000-0000-0000-000000000007', v_coffee_biz_id, v_coffee_event_branch_id, 'Event Space', 'event_space', 30, 'Event space with projector and coffee service.', 'active')
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    name = excluded.name,
    resource_type = excluded.resource_type,
    capacity = excluded.capacity,
    description = excluded.description,
    status = 'active',
    updated_at = now();

  -- 11. Demo bookings
  insert into public.bookings (id, business_id, branch_id, customer_id, staff_id, service_id, resource_id, booking_type, booking_date, start_time, end_time, status, notes, total_amount, payment_status)
  values
    ('b1000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'appointment', current_date, '10:00', '10:30', 'confirmed', 'Today demo haircut booking.', 25.00, 'unpaid'),
    ('b1000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '5c000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'appointment', current_date, '11:00', '11:45', 'confirmed', 'Today demo haircut and beard booking.', 40.00, 'unpaid'),
    ('b1000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'appointment', current_date + 1, '14:00', '14:25', 'pending', 'Tomorrow kids haircut booking.', 20.00, 'unpaid'),
    ('b1000000-0000-0000-0000-000000000004', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'appointment', current_date - 2, '15:00', '15:45', 'completed', 'Completed demo service for review and reports.', 40.00, 'paid'),
    ('b1000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_branch_id, 'c0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', '5c000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000004', 'table', current_date, '09:00', '10:00', 'confirmed', 'Morning table reservation.', 0.00, 'unpaid'),
    ('b1000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_event_branch_id, 'c0000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005', '5c000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000007', 'event', current_date - 1, '15:00', '17:00', 'completed', 'Completed event space booking.', 50.00, 'paid')
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    customer_id = excluded.customer_id,
    staff_id = excluded.staff_id,
    service_id = excluded.service_id,
    resource_id = excluded.resource_id,
    booking_date = excluded.booking_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    status = excluded.status,
    total_amount = excluded.total_amount,
    payment_status = excluded.payment_status,
    updated_at = now();

  -- 12. Demo membership plans
  insert into public.membership_plans (id, business_id, name, plan_type, description, price, duration_days, credit_amount, visit_limit, points_bonus, discount_percent, benefits, renewal_setting, is_active)
  values
    ('70000000-0000-0000-0000-000000000001', v_barber_biz_id, 'Basic Cut Plan', 'subscription', 'Monthly plan for regular haircut customers.', 49.00, 30, 0, 1, 50, 10, '{"free_wash":false,"priority_booking":false}'::jsonb, 'auto', true),
    ('70000000-0000-0000-0000-000000000002', v_barber_biz_id, 'Premium Grooming', 'vip', 'Premium grooming membership with priority booking and product discount.', 99.00, 30, 50.00, null, 200, 20, '{"free_wash":true,"priority_booking":true,"product_discount":20}'::jsonb, 'auto', true),
    ('70000000-0000-0000-0000-000000000003', v_coffee_biz_id, 'Coffee Lover', 'subscription', 'Monthly coffee membership with drink discounts.', 39.00, 30, 0, null, 100, 10, '{"free_birthday_drink":true,"monthly_tasting":false}'::jsonb, 'auto', true),
    ('70000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'Daily Coffee', 'subscription', 'Daily drink membership for regular coffee customers.', 99.00, 30, 0, null, 300, 15, '{"free_daily_drink":true,"priority_seating":true}'::jsonb, 'auto', true),
    ('70000000-0000-0000-0000-000000000005', v_coffee_biz_id, 'Prepaid RM100 get RM110 credit', 'prepaid_credit', 'Pay RM100 and receive RM110 stored credit.', 100.00, 365, 110.00, null, 100, 0, '{"bonus_credit":10}'::jsonb, 'manual', true)
  on conflict (id) do update set
    business_id = excluded.business_id,
    name = excluded.name,
    plan_type = excluded.plan_type,
    description = excluded.description,
    price = excluded.price,
    duration_days = excluded.duration_days,
    credit_amount = excluded.credit_amount,
    visit_limit = excluded.visit_limit,
    points_bonus = excluded.points_bonus,
    discount_percent = excluded.discount_percent,
    benefits = excluded.benefits,
    renewal_setting = excluded.renewal_setting,
    is_active = true,
    updated_at = now();

  -- 13. Demo memberships
  insert into public.memberships (id, business_id, customer_id, plan_id, status, start_date, end_date, remaining_credit, remaining_visits, auto_renew, qr_code)
  values
    ('80000000-0000-0000-0000-000000000001', v_barber_biz_id, 'c0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'active', current_date - 20, current_date + 10, 35.00, 0, true, 'DEMO-BARBER-PREMIUM-001'),
    ('80000000-0000-0000-0000-000000000002', v_barber_biz_id, 'c0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'active', current_date - 5, current_date + 25, 0, 1, true, 'DEMO-BARBER-BASIC-002'),
    ('80000000-0000-0000-0000-000000000003', v_coffee_biz_id, 'c0000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000003', 'active', current_date - 12, current_date + 18, 0, 0, true, 'DEMO-COFFEE-LOVER-004'),
    ('80000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'c0000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000005', 'active', current_date - 30, current_date + 335, 72.00, 0, false, 'DEMO-COFFEE-PREPAID-005')
  on conflict (id) do update set
    business_id = excluded.business_id,
    customer_id = excluded.customer_id,
    plan_id = excluded.plan_id,
    status = 'active',
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    remaining_credit = excluded.remaining_credit,
    remaining_visits = excluded.remaining_visits,
    auto_renew = excluded.auto_renew,
    qr_code = excluded.qr_code,
    updated_at = now();

  -- 14. Demo products
  insert into public.products (id, business_id, branch_id, name, category, sku, cost_price, selling_price, stock_quantity, low_stock_threshold, is_active)
  values
    ('90000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'Pomade Classic', 'Hair Products', 'DEMO-BARBER-POMADE', 8.00, 25.00, 30, 5, true),
    ('90000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'Beard Oil Premium', 'Beard Care', 'DEMO-BARBER-BEARD-OIL', 12.00, 35.00, 15, 3, true),
    ('90000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_branch_id, 'Latte', 'Beverages', 'DEMO-COFFEE-LATTE', 4.50, 12.00, 999, 50, true),
    ('90000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_branch_id, 'Americano', 'Beverages', 'DEMO-COFFEE-AMERICANO', 3.00, 9.00, 999, 50, true),
    ('90000000-0000-0000-0000-000000000007', v_coffee_biz_id, v_coffee_branch_id, 'Cappuccino', 'Beverages', 'DEMO-COFFEE-CAPPUCCINO', 4.00, 11.00, 999, 50, true),
    ('90000000-0000-0000-0000-000000000008', v_coffee_biz_id, v_coffee_branch_id, 'Breakfast Set', 'Food', 'DEMO-COFFEE-BREAKFAST', 8.00, 18.00, 50, 10, true)
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    name = excluded.name,
    category = excluded.category,
    sku = excluded.sku,
    cost_price = excluded.cost_price,
    selling_price = excluded.selling_price,
    stock_quantity = excluded.stock_quantity,
    low_stock_threshold = excluded.low_stock_threshold,
    is_active = true,
    updated_at = now();

  -- 15. Demo POS orders
  insert into public.pos_orders (id, business_id, branch_id, customer_id, staff_id, order_number, subtotal, discount_amount, tax_amount, total_amount, payment_status, order_status, points_earned, notes, completed_at)
  values
    ('c1000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'DEMO-BARBER-POS-001', 65.00, 0.00, 0.00, 65.00, 'paid', 'completed', 65, 'Completed haircut and product order.', now() - interval '2 days'),
    ('c1000000-0000-0000-0000-000000000002', v_coffee_biz_id, v_coffee_branch_id, 'c0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 'DEMO-COFFEE-POS-001', 42.00, 4.00, 0.00, 38.00, 'paid', 'completed', 38, 'Morning coffee and breakfast order.', now() - interval '1 day'),
    ('c1000000-0000-0000-0000-000000000003', v_coffee_biz_id, v_coffee_branch_id, 'c0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', 'DEMO-COFFEE-POS-002', 23.00, 0.00, 0.00, 23.00, 'paid', 'completed', 23, 'Two-drink demo order.', now() - interval '3 hours')
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    customer_id = excluded.customer_id,
    staff_id = excluded.staff_id,
    order_number = excluded.order_number,
    subtotal = excluded.subtotal,
    discount_amount = excluded.discount_amount,
    tax_amount = excluded.tax_amount,
    total_amount = excluded.total_amount,
    payment_status = 'paid',
    order_status = 'completed',
    points_earned = excluded.points_earned,
    notes = excluded.notes,
    completed_at = excluded.completed_at,
    updated_at = now();

  insert into public.pos_order_items (id, order_id, item_type, item_id, item_name, quantity, unit_price, total_price)
  values
    ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'service', '5c000000-0000-0000-0000-000000000002', 'Haircut + Beard', 1, 40.00, 40.00),
    ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'product', '90000000-0000-0000-0000-000000000001', 'Pomade Classic', 1, 25.00, 25.00),
    ('c2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'product', '90000000-0000-0000-0000-000000000005', 'Latte', 2, 12.00, 24.00),
    ('c2000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'product', '90000000-0000-0000-0000-000000000008', 'Breakfast Set', 1, 18.00, 18.00),
    ('c2000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000003', 'product', '90000000-0000-0000-0000-000000000006', 'Americano', 1, 9.00, 9.00),
    ('c2000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000003', 'product', '90000000-0000-0000-0000-000000000007', 'Cappuccino', 1, 11.00, 11.00)
  on conflict (id) do update set
    order_id = excluded.order_id,
    item_type = excluded.item_type,
    item_id = excluded.item_id,
    item_name = excluded.item_name,
    quantity = excluded.quantity,
    unit_price = excluded.unit_price,
    total_price = excluded.total_price;

  -- 16. Demo payments
  insert into public.payments (id, business_id, customer_id, reference_type, reference_id, payment_method, amount, status, paid_at, transaction_id)
  values
    ('d0000000-0000-0000-0000-000000000001', v_barber_biz_id, 'c0000000-0000-0000-0000-000000000001', 'booking', 'b1000000-0000-0000-0000-000000000004', 'cash', 40.00, 'paid', now() - interval '2 days', 'DEMO-CASH-001'),
    ('d0000000-0000-0000-0000-000000000002', v_barber_biz_id, 'c0000000-0000-0000-0000-000000000001', 'pos_order', 'c1000000-0000-0000-0000-000000000001', 'card', 65.00, 'paid', now() - interval '2 days', 'DEMO-CARD-001'),
    ('d0000000-0000-0000-0000-000000000003', v_coffee_biz_id, 'c0000000-0000-0000-0000-000000000004', 'pos_order', 'c1000000-0000-0000-0000-000000000002', 'qr', 38.00, 'paid', now() - interval '1 day', 'DEMO-QR-001'),
    ('d0000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'c0000000-0000-0000-0000-000000000005', 'membership', '80000000-0000-0000-0000-000000000004', 'cash', 100.00, 'paid', now() - interval '30 days', 'DEMO-CASH-002')
  on conflict (id) do update set
    business_id = excluded.business_id,
    customer_id = excluded.customer_id,
    reference_type = excluded.reference_type,
    reference_id = excluded.reference_id,
    payment_method = excluded.payment_method,
    amount = excluded.amount,
    status = 'paid',
    paid_at = excluded.paid_at,
    transaction_id = excluded.transaction_id,
    updated_at = now();

  -- 17. Demo loyalty transactions
  insert into public.loyalty_transactions (id, business_id, customer_id, transaction_type, points, description, reference_type, reference_id, balance_after)
  values
    ('e1000000-0000-0000-0000-000000000001', v_barber_biz_id, 'c0000000-0000-0000-0000-000000000001', 'earn', 65, 'Earned from demo POS order.', 'payment', 'd0000000-0000-0000-0000-000000000002', 450),
    ('e1000000-0000-0000-0000-000000000002', v_barber_biz_id, 'c0000000-0000-0000-0000-000000000002', 'earn', 40, 'Earned from Haircut + Beard visit.', 'booking', 'b1000000-0000-0000-0000-000000000002', 210),
    ('e1000000-0000-0000-0000-000000000003', v_coffee_biz_id, 'c0000000-0000-0000-0000-000000000004', 'earn', 38, 'Earned from coffee breakfast order.', 'payment', 'd0000000-0000-0000-0000-000000000003', 180),
    ('e1000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'c0000000-0000-0000-0000-000000000005', 'earn', 100, 'Earned from prepaid membership purchase.', 'payment', 'd0000000-0000-0000-0000-000000000004', 90)
  on conflict (id) do update set
    business_id = excluded.business_id,
    customer_id = excluded.customer_id,
    transaction_type = excluded.transaction_type,
    points = excluded.points,
    description = excluded.description,
    reference_type = excluded.reference_type,
    reference_id = excluded.reference_id,
    balance_after = excluded.balance_after;

  -- 18. Demo rewards
  insert into public.rewards (id, business_id, name, description, reward_type, points_required, discount_amount, discount_percent, free_item, is_active)
  values
    ('e2000000-0000-0000-0000-000000000001', v_barber_biz_id, 'Free Hair Wash', 'Redeem one complimentary hair wash.', 'free_service', 100, null, null, 'Hair Wash', true),
    ('e2000000-0000-0000-0000-000000000002', v_barber_biz_id, 'RM5 Discount', 'Redeem RM5 off any barber service.', 'discount', 100, 5.00, null, null, true),
    ('e2000000-0000-0000-0000-000000000003', v_coffee_biz_id, 'Free Latte', 'Redeem one free latte.', 'free_item', 100, null, null, 'Latte', true),
    ('e2000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'RM3 Coffee Discount', 'Redeem RM3 off your next coffee order.', 'discount', 80, 3.00, null, null, true)
  on conflict (id) do update set
    business_id = excluded.business_id,
    name = excluded.name,
    description = excluded.description,
    reward_type = excluded.reward_type,
    points_required = excluded.points_required,
    discount_amount = excluded.discount_amount,
    discount_percent = excluded.discount_percent,
    free_item = excluded.free_item,
    is_active = true,
    updated_at = now();

  -- 19. Demo reviews
  insert into public.reviews (id, business_id, branch_id, customer_id, booking_id, pos_order_id, staff_id, service_id, rating, staff_rating, service_rating, title, comment, source, status, created_at)
  values
    ('f1000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', null, '50000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000002', 5, 5, 5, 'Great cut', 'Ahmad was fast and the beard trim was clean.', 'customer_portal', 'published', now() - interval '2 days'),
    ('f1000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_branch_id, 'c0000000-0000-0000-0000-000000000002', null, 'c1000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '5c000000-0000-0000-0000-000000000002', 4, 5, 4, 'Good service', 'Smooth checkout and friendly staff.', 'customer_portal', 'published', now() - interval '1 day'),
    ('f1000000-0000-0000-0000-000000000003', v_coffee_biz_id, v_coffee_event_branch_id, 'c0000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', null, '50000000-0000-0000-0000-000000000005', '5c000000-0000-0000-0000-000000000006', 5, 5, 5, 'Perfect event setup', 'Private room was ready and the coffee service was excellent.', 'customer_portal', 'published', now() - interval '1 day'),
    ('f1000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_branch_id, 'c0000000-0000-0000-0000-000000000004', null, 'c1000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000004', null, 3, 4, 3, 'Busy morning', 'Latte was good but the wait was longer than usual.', 'customer_portal', 'hidden', now() - interval '12 hours')
  on conflict (id) do update set
    business_id = excluded.business_id,
    branch_id = excluded.branch_id,
    customer_id = excluded.customer_id,
    booking_id = excluded.booking_id,
    pos_order_id = excluded.pos_order_id,
    staff_id = excluded.staff_id,
    service_id = excluded.service_id,
    rating = excluded.rating,
    staff_rating = excluded.staff_rating,
    service_rating = excluded.service_rating,
    title = excluded.title,
    comment = excluded.comment,
    source = excluded.source,
    status = excluded.status,
    updated_at = now();

  -- 20. Demo audit logs
  insert into public.audit_logs (id, business_id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at)
  values
    ('f2000000-0000-0000-0000-000000000001', v_barber_biz_id, null, 'created_booking', 'bookings', 'b1000000-0000-0000-0000-000000000001', null, '{"status":"confirmed","source":"phase39_seed"}'::jsonb, '127.0.0.1', 'Phase 39 seed', now() - interval '2 days'),
    ('f2000000-0000-0000-0000-000000000002', v_barber_biz_id, null, 'created_pos_order', 'pos_orders', 'c1000000-0000-0000-0000-000000000001', null, '{"total_amount":65,"source":"phase39_seed"}'::jsonb, '127.0.0.1', 'Phase 39 seed', now() - interval '2 days'),
    ('f2000000-0000-0000-0000-000000000003', v_coffee_biz_id, null, 'created_membership', 'memberships', '80000000-0000-0000-0000-000000000004', null, '{"plan":"Prepaid RM100 get RM110 credit","source":"phase39_seed"}'::jsonb, '127.0.0.1', 'Phase 39 seed', now() - interval '1 day'),
    ('f2000000-0000-0000-0000-000000000004', v_coffee_biz_id, null, 'edited_inventory', 'products', '90000000-0000-0000-0000-000000000008', '{"stock_quantity":45}'::jsonb, '{"stock_quantity":50,"source":"phase39_seed"}'::jsonb, '127.0.0.1', 'Phase 39 seed', now() - interval '12 hours')
  on conflict (id) do nothing;

  update public.user_profiles
  set is_demo_user = true,
      updated_at = now()
  where business_id in (v_barber_biz_id, v_coffee_biz_id)
     or email in ('barber_owner@demo.com', 'coffee_owner@demo.com', 'staff1@demo.com', 'staff2@demo.com', 'staff3@demo.com', 'staff1_coffee@demo.com', 'staff2_coffee@demo.com', 'customer1@demo.com', 'customer2@demo.com', 'customer3@demo.com', 'customer4@demo.com', 'customer5@demo.com', 'customer6@demo.com');

  update public.businesses
  set demo_reset_at = now(),
      updated_at = now()
  where id in (v_barber_biz_id, v_coffee_biz_id);
end $$;
