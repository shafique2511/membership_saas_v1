-- Luxantara Members - Phase 22: Realistic Seed Data
-- Requires: phase_2_seed.sql (packages, modules, package_modules) already applied
-- Run this AFTER all migrations have been applied.
--
-- Creates:
--   2 demo businesses (barber, coffee shop)
--   Branches, staff, customers, services, resources, products
--   Bookings, membership plans, memberships, POS orders, payments
--   Loyalty points, rewards, transactions
--
-- Auth users for demo login are inserted at the end.
-- Demo credentials:
--   barber_owner@demo.com / Demo@123456  → Barber Shop owner
--   coffee_owner@demo.com / Demo@123456  → Coffee Shop owner
--   staff1@demo.com / Demo@123456       → Barber staff
--   staff2@demo.com / Demo@123456       → Coffee staff
--   customer1@demo.com / Demo@123456    → Barber customer
--   customer2@demo.com / Demo@123456    → Coffee customer
--   customer3@demo.com / Demo@123456    → Barber customer (new)

-- ============================================================================
-- 1. Packages  (already seeded in phase_2_seed.sql)
-- ============================================================================
-- Packages seed from phase_2_seed.sql is required. We reference by slug.

-- ============================================================================
-- 2. Modules  (already seeded in phase_2_seed.sql)
-- ============================================================================
-- Modules seed from phase_2_seed.sql is required. We reference by module_key.

-- ============================================================================
-- 3. Package modules  (already seeded in phase_2_seed.sql)
-- ============================================================================
-- Package-module mappings from phase_2_seed.sql are required.

-- ============================================================================
-- 4. Demo barber business
-- ============================================================================
do $$ declare
  v_barber_biz_id uuid;
  v_coffee_biz_id uuid;
  v_pro_pkg_id uuid;
  v_growth_pkg_id uuid;
  v_starter_pkg_id uuid;
  v_barber_main_branch_id uuid;
  v_coffee_main_branch_id uuid;
  v_barber_branch2_id uuid;
  v_staff1_id uuid;
  v_staff2_id uuid;
  v_staff3_id uuid;
  v_staff4_id uuid;
  v_customer1_id uuid;
  v_customer2_id uuid;
  v_customer3_id uuid;
  v_customer4_id uuid;
  v_customer5_id uuid;
  v_service1_id uuid;
  v_service2_id uuid;
  v_service3_id uuid;
  v_service4_id uuid;
  v_resource1_id uuid;
  v_resource2_id uuid;
  v_resource3_id uuid;
  v_resource4_id uuid;
  v_product1_id uuid;
  v_product2_id uuid;
  v_product3_id uuid;
  v_product4_id uuid;
  v_booking1_id uuid;
  v_booking2_id uuid;
  v_booking3_id uuid;
  v_booking4_id uuid;
  v_plan1_id uuid;
  v_plan2_id uuid;
  v_plan3_id uuid;
  v_plan4_id uuid;
  v_plan5_id uuid;
  v_membership1_id uuid;
  v_membership2_id uuid;
  v_membership3_id uuid;
  v_order1_id uuid;
  v_order2_id uuid;
  v_reward1_id uuid;
  v_reward2_id uuid;
  v_reward3_id uuid;
  v_user_owner1 uuid;
  v_user_owner2 uuid;
  v_user_staff1 uuid;
  v_user_staff2 uuid;
  v_user_cust1 uuid;
  v_user_cust2 uuid;
  v_user_cust3 uuid;
begin

select id into v_pro_pkg_id from public.packages where slug = 'pro' limit 1;
select id into v_growth_pkg_id from public.packages where slug = 'growth' limit 1;
select id into v_starter_pkg_id from public.packages where slug = 'starter' limit 1;

-- ============================================================================
-- 4 & 5: Demo businesses
-- ============================================================================
insert into public.businesses (id, name, business_type, phone, email, address, timezone, status)
values
  ('a0000000-0000-0000-0000-000000000001', 'Classic Barber House', 'barber_shop', '+60123456789', 'barber_owner@demo.com', '12 Jalan Tunku, 50400 Kuala Lumpur', 'Asia/Kuala_Lumpur', 'active'),
  ('a0000000-0000-0000-0000-000000000002', 'Brew & Bean Cafe', 'coffee_shop', '+60198765432', 'coffee_owner@demo.com', '45 Jalan Ampang, 50450 Kuala Lumpur', 'Asia/Kuala_Lumpur', 'active')
on conflict (id) do nothing;

select id into v_barber_biz_id from public.businesses where name = 'Classic Barber House';
select id into v_coffee_biz_id from public.businesses where name = 'Brew & Bean Cafe';

-- Ensure core exists even when this seed is run after a partially applied module seed.
insert into public.modules (module_key, module_name, description, category, is_core, is_active, sort_order)
values ('core', 'Core Business System', 'Business profile, customers, settings, base dashboard, and tenant controls.', 'platform', true, true, 10)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  description = excluded.description,
  category = excluded.category,
  is_core = excluded.is_core,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ============================================================================
-- 6. Demo subscriptions + module access
-- ============================================================================
-- Barber: Pro package (monthly, active)
insert into public.business_subscriptions (business_id, package_id, status, billing_cycle, start_date, next_billing_date)
values (v_barber_biz_id, v_pro_pkg_id, 'active', 'monthly', '2026-01-01', '2026-06-01')
on conflict do nothing;

-- Coffee: Growth package (monthly, active)
insert into public.business_subscriptions (business_id, package_id, status, billing_cycle, start_date, next_billing_date)
values (v_coffee_biz_id, v_growth_pkg_id, 'active', 'monthly', '2026-02-01', '2026-06-01')
on conflict do nothing;

-- Enable modules for barber (Pro level)
insert into public.business_module_access (business_id, module_key, access_level, source, is_enabled, limit_config)
select v_barber_biz_id, m.module_key,
  case
    when pm.access_level is not null then pm.access_level
    else 'basic'
  end,
  'package', true,
  coalesce(pm.limit_config, '{}'::jsonb)
from public.modules m
left join public.package_modules pm on pm.package_id = v_pro_pkg_id and pm.module_id = m.id
where m.is_active = true
  and m.module_key in ('core', 'data_ownership_backup', 'booking', 'membership', 'loyalty', 'pos', 'inventory', 'staff_commission', 'payment', 'notification', 'reports', 'marketing', 'customer_portal')
on conflict (business_id, module_key, source) do update set access_level = excluded.access_level, is_enabled = excluded.is_enabled, limit_config = excluded.limit_config;

-- Enable modules for coffee (Growth level)
insert into public.business_module_access (business_id, module_key, access_level, source, is_enabled, limit_config)
select v_coffee_biz_id, m.module_key,
  case
    when pm.access_level is not null then pm.access_level
    else 'basic'
  end,
  'package', true,
  coalesce(pm.limit_config, '{}'::jsonb)
from public.modules m
left join public.package_modules pm on pm.package_id = v_growth_pkg_id and pm.module_id = m.id
where m.is_active = true
  and m.module_key in ('core', 'data_ownership_backup', 'booking', 'membership', 'loyalty', 'payment', 'customer_portal', 'reports')
on conflict (business_id, module_key, source) do update set access_level = excluded.access_level, is_enabled = excluded.is_enabled, limit_config = excluded.limit_config;

-- Demo data needs core access before branch/staff/customer limit triggers run.
-- Barber has two demo branches, so raise only this seed business limit to match the fixture.
insert into public.business_module_access (business_id, module_key, access_level, source, is_enabled, limit_config)
values
  (v_barber_biz_id, 'core', 'pro', 'package', true, '{"branches":2,"staff":25,"customers":10000}'::jsonb),
  (v_coffee_biz_id, 'core', 'basic', 'package', true, '{"branches":1,"staff":8,"customers":2000}'::jsonb)
on conflict (business_id, module_key, source) do update set
  access_level = excluded.access_level,
  is_enabled = excluded.is_enabled,
  limit_config = excluded.limit_config,
  updated_at = now();

-- ============================================================================
-- 6. Demo branches (continued)
-- ============================================================================
-- Barber: 2 branches
insert into public.branches (id, business_id, name, address, phone, is_main, opening_hours)
values
  ('b0000000-0000-0000-0000-000000000001', v_barber_biz_id, 'Main Branch - KL', '12 Jalan Tunku, 50400 Kuala Lumpur', '+60123456789', true, '{"monday":{"open":"09:00","close":"19:00"},"tuesday":{"open":"09:00","close":"19:00"},"wednesday":{"open":"09:00","close":"19:00"},"thursday":{"open":"09:00","close":"19:00"},"friday":{"open":"09:00","close":"19:00"},"saturday":{"open":"09:00","close":"18:00"},"sunday":{"open":"10:00","close":"17:00"}}'::jsonb),
  ('b0000000-0000-0000-0000-000000000002', v_barber_biz_id, 'PJ Branch', '88 Jalan SS2, 47300 Petaling Jaya', '+60123456780', false, '{"monday":{"open":"10:00","close":"20:00"},"tuesday":{"open":"10:00","close":"20:00"},"wednesday":{"open":"10:00","close":"20:00"},"thursday":{"open":"10:00","close":"20:00"},"friday":{"open":"10:00","close":"20:00"},"saturday":{"open":"09:00","close":"18:00"},"sunday":{"open":"10:00","close":"16:00"}}'::jsonb)
on conflict (id) do nothing;

select id into v_barber_main_branch_id from public.branches where name = 'Main Branch - KL';

-- Coffee: 1 branch
insert into public.branches (id, business_id, name, address, phone, is_main, opening_hours)
values
  ('b0000000-0000-0000-0000-000000000003', v_coffee_biz_id, 'Ampang Main', '45 Jalan Ampang, 50450 Kuala Lumpur', '+60198765432', true, '{"monday":{"open":"07:00","close":"22:00"},"tuesday":{"open":"07:00","close":"22:00"},"wednesday":{"open":"07:00","close":"22:00"},"thursday":{"open":"07:00","close":"22:00"},"friday":{"open":"07:00","close":"23:00"},"saturday":{"open":"08:00","close":"23:00"},"sunday":{"open":"08:00","close":"22:00"}}'::jsonb)
on conflict (id) do nothing;

select id into v_coffee_main_branch_id from public.branches where name = 'Ampang Main';

-- ============================================================================
-- 7. Demo staff
-- ============================================================================
insert into public.staff (id, business_id, branch_id, full_name, phone, email, role, commission_rate, working_hours, off_days)
values
  ('s0000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, 'Ahmad Bin Ismail', '+60111111111', 'staff1@demo.com', 'barber', 30, '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"09:00","end":"17:00"}}'::jsonb, '["sunday"]'::jsonb),
  ('s0000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_main_branch_id, 'Siti Binti Rahman', '+60111111112', 'staff2@demo.com', 'barber', 25, '{"monday":{"start":"10:00","end":"19:00"},"tuesday":{"start":"10:00","end":"19:00"},"wednesday":{"start":"10:00","end":"19:00"},"thursday":{"start":"10:00","end":"19:00"},"friday":{"start":"10:00","end":"19:00"},"saturday":{"start":"10:00","end":"18:00"}}'::jsonb, '["sunday"]'::jsonb),
  ('s0000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_main_branch_id, 'Rajesh Kumar', '+60111111113', 'staff3@demo.com', 'barber', 20, '{"monday":{"start":"11:00","end":"20:00"},"tuesday":{"start":"11:00","end":"20:00"},"wednesday":{"start":"11:00","end":"20:00"},"thursday":{"start":"11:00","end":"20:00"},"friday":{"start":"11:00","end":"20:00"},"saturday":{"start":"10:00","end":"17:00"}}'::jsonb, '["sunday"]'::jsonb)
on conflict (id) do nothing;

insert into public.staff (id, business_id, branch_id, full_name, phone, email, role, commission_rate, working_hours, off_days)
values
  ('s0000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_main_branch_id, 'Mei Ling Tan', '+60122222221', 'staff1_coffee@demo.com', 'barista', 0, '{"monday":{"start":"06:00","end":"15:00"},"tuesday":{"start":"06:00","end":"15:00"},"wednesday":{"start":"06:00","end":"15:00"},"thursday":{"start":"06:00","end":"15:00"},"friday":{"start":"06:00","end":"15:00"},"saturday":{"start":"07:00","end":"14:00"}}'::jsonb, '["sunday"]'::jsonb),
  ('s0000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_main_branch_id, 'Priya Nair', '+60122222222', 'staff2_coffee@demo.com', 'barista', 0, '{"monday":{"start":"14:00","end":"22:00"},"tuesday":{"start":"14:00","end":"22:00"},"wednesday":{"start":"14:00","end":"22:00"},"thursday":{"start":"14:00","end":"22:00"},"friday":{"start":"14:00","end":"23:00"},"saturday":{"start":"14:00","end":"23:00"}}'::jsonb, '["sunday"]'::jsonb)
on conflict (id) do nothing;

select id into v_staff1_id from public.staff where email = 'staff1@demo.com';
select id into v_staff2_id from public.staff where email = 'staff2@demo.com';

-- ============================================================================
-- 8. Demo customers
-- ============================================================================
insert into public.customers (id, business_id, branch_id, full_name, phone, email, birthday, points_balance, total_spent, visit_count, no_show_count, status)
values
  ('c0000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, 'John Tan', '+60123450001', 'customer1@demo.com', '1990-05-15', 450, 1275.00, 15, 0, 'active'),
  ('c0000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_main_branch_id, 'Sarah Lim', '+60123450002', 'customer2@demo.com', '1995-08-22', 210, 680.00, 8, 1, 'active'),
  ('c0000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_main_branch_id, 'David Chong', '+60123450003', 'customer3@demo.com', '1988-12-03', 60, 320.00, 4, 0, 'active'),
  ('c0000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_main_branch_id, 'Lisa Wong', '+60123450004', 'customer4@demo.com', '1992-03-10', 180, 540.00, 25, 0, 'active'),
  ('c0000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_main_branch_id, 'Adam Malik', '+60123450005', 'customer5@demo.com', '1997-07-19', 90, 210.00, 12, 2, 'active')
on conflict (id) do nothing;

select id into v_customer1_id from public.customers where email = 'customer1@demo.com';
select id into v_customer2_id from public.customers where email = 'customer2@demo.com';
select id into v_customer3_id from public.customers where email = 'customer3@demo.com';
select id into v_customer4_id from public.customers where email = 'customer4@demo.com';
select id into v_customer5_id from public.customers where email = 'customer5@demo.com';

-- ============================================================================
-- 9. Demo services  (barber)
-- ============================================================================
insert into public.services (id, business_id, branch_id, name, category, description, duration_minutes, price, is_bookable)
values
  ('svc00000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, 'Classic Haircut', 'Hair Services', 'Precision haircut with consultation and styling', 30, 25.00, true),
  ('svc00000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_main_branch_id, 'Haircut + Beard Trim', 'Hair Services', 'Full haircut with beard shaping and trim', 45, 40.00, true),
  ('svc00000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_main_branch_id, 'Kids Haircut', 'Hair Services', 'Gentle haircut for children under 12', 25, 20.00, true),
  ('svc00000-0000-0000-0000-000000000004', v_barber_biz_id, v_barber_main_branch_id, 'Hair Wash & Scalp Massage', 'Hair Services', 'Deep cleansing hair wash with relaxing scalp massage', 15, 10.00, true)
on conflict (id) do nothing;

select id into v_service1_id from public.services where name = 'Classic Haircut';
select id into v_service2_id from public.services where name = 'Haircut + Beard Trim';
select id into v_service3_id from public.services where name = 'Kids Haircut';
select id into v_service4_id from public.services where name = 'Hair Wash & Scalp Massage';

-- Coffee shop has resources (tables), not services. But add "services" like bar for booking.
insert into public.services (id, business_id, branch_id, name, category, description, duration_minutes, price, is_bookable)
values
  ('svc00000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_main_branch_id, 'Coffee Bar Experience', 'F&B', 'Reserve a spot at our artisanal coffee bar', 60, 0.00, true),
  ('svc00000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_main_branch_id, 'Brunch Booking', 'F&B', 'Premium brunch seating reservation', 90, 0.00, true)
on conflict (id) do nothing;

-- ============================================================================
-- 10. Demo resources
-- ============================================================================
-- Barber: barber chairs as resources
insert into public.bookable_resources (id, business_id, branch_id, name, resource_type, capacity, description)
values
  ('r0000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, 'Chair 1 - Window', 'barber_chair', 1, 'Barber chair near the window, lots of natural light'),
  ('r0000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_main_branch_id, 'Chair 2 - Mirror', 'barber_chair', 1, 'Standard barber chair with large mirror'),
  ('r0000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_main_branch_id, 'Chair 3 - Premium', 'barber_chair', 1, 'Premium leather barber chair with back massage')
on conflict (id) do nothing;

-- Coffee: tables and rooms as resources
insert into public.bookable_resources (id, business_id, branch_id, name, resource_type, capacity, description)
values
  ('r0000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_coffee_main_branch_id, 'Table for 2', 'table', 2, 'Cozy table for two near the window'),
  ('r0000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_main_branch_id, 'Table for 4', 'table', 4, 'Spacious table for groups'),
  ('r0000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_main_branch_id, 'Private Room', 'room', 6, 'Air-conditioned private room for meetings or events'),
  ('r0000000-0000-0000-0000-000000000007', v_coffee_biz_id, v_coffee_main_branch_id, 'Event Space', 'event_space', 30, 'Open event space with projector and sound system')
on conflict (id) do nothing;

-- Assign staff to barber chairs (via staff_services from later phase, skip for now)

-- ============================================================================
-- 11. Demo bookings
-- ============================================================================
-- Barber bookings (today + past)
insert into public.bookings (id, business_id, branch_id, customer_id, staff_id, service_id, booking_type, booking_date, start_time, end_time, status, total_amount, payment_status)
values
  ('bk000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, v_customer1_id, v_staff1_id, v_service1_id, 'appointment', current_date, '10:00', '10:30', 'confirmed', 25.00, 'unpaid'),
  ('bk000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_main_branch_id, v_customer2_id, v_staff2_id, v_service2_id, 'appointment', current_date, '11:00', '11:45', 'confirmed', 40.00, 'unpaid'),
  ('bk000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_main_branch_id, v_customer3_id, v_staff1_id, v_service3_id, 'appointment', current_date, '14:00', '14:25', 'pending', 20.00, 'unpaid'),
  -- Past completed booking
  ('bk000000-0000-0000-0000-000000000004', v_barber_biz_id, v_barber_main_branch_id, v_customer1_id, v_staff1_id, v_service1_id, 'appointment', current_date - 3, '10:00', '10:30', 'completed', 25.00, 'paid')
on conflict (id) do nothing;

-- Coffee bookings (today)
insert into public.bookings (id, business_id, branch_id, customer_id, service_id, resource_id, booking_type, booking_date, start_time, end_time, status, total_amount, payment_status, notes)
values
  ('bk000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_main_branch_id, v_customer4_id, (select id from public.services where business_id = v_coffee_biz_id and name = 'Coffee Bar Experience' limit 1), (select id from public.bookable_resources where business_id = v_coffee_biz_id and name = 'Table for 2' limit 1), 'table', current_date, '09:00', '10:00', 'confirmed', 0.00, 'unpaid', 'Window seat preferred'),
  ('bk000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_main_branch_id, v_customer5_id, (select id from public.services where business_id = v_coffee_biz_id and name = 'Brunch Booking' limit 1), (select id from public.bookable_resources where business_id = v_coffee_biz_id and name = 'Table for 4' limit 1), 'table', current_date, '12:00', '13:30', 'confirmed', 0.00, 'unpaid', 'Birthday celebration')
on conflict (id) do nothing;

select id into v_booking1_id from public.bookings where id = 'bk000000-0000-0000-0000-000000000001';
select id into v_booking4_id from public.bookings where id = 'bk000000-0000-0000-0000-000000000004';

-- ============================================================================
-- 12. Demo membership plans
-- ============================================================================
insert into public.membership_plans (id, business_id, name, plan_type, description, price, duration_days, credit_amount, visit_limit, points_bonus, discount_percent, benefits)
values
  ('p0000000-0000-0000-0000-000000000001', v_barber_biz_id, 'Basic Cut Plan', 'subscription', 'One haircut per month + 10% off additional services', 49.00, 30, 0, 1, 50, 10, '{"free_wash":false,"priority_booking":false}'::jsonb),
  ('p0000000-0000-0000-0000-000000000002', v_barber_biz_id, 'Premium Grooming', 'vip', 'Unlimited haircuts, free hair wash, 20% off products, priority booking', 99.00, 30, 50.00, null, 200, 20, '{"free_wash":true,"priority_booking":true,"exclusive_events":true}'::jsonb),
  ('p0000000-0000-0000-0000-000000000003', v_barber_biz_id, 'Prepaid RM100', 'prepaid_credit', 'Get RM100 credit for RM90 — save 10% on all services', 90.00, 365, 100.00, null, 100, 0, '{}'::jsonb),
  ('p0000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'Coffee Lover', 'subscription', '10% off all drinks + free birthday drink', 39.00, 30, 0, null, 100, 10, '{"free_birthday_drink":true,"monthly_tasting":false}'::jsonb),
  ('p0000000-0000-0000-0000-000000000005', v_coffee_biz_id, 'Daily Coffee', 'subscription', 'One free drink daily + 15% off food', 99.00, 30, 0, null, 300, 15, '{"free_daily_drink":true,"priority_seating":true}'::jsonb)
on conflict (id) do nothing;

select id into v_plan1_id from public.membership_plans where name = 'Basic Cut Plan' and business_id = v_barber_biz_id;
select id into v_plan2_id from public.membership_plans where name = 'Premium Grooming' and business_id = v_barber_biz_id;
select id into v_plan3_id from public.membership_plans where name = 'Prepaid RM100' and business_id = v_barber_biz_id;
select id into v_plan4_id from public.membership_plans where name = 'Coffee Lover' and business_id = v_coffee_biz_id;
select id into v_plan5_id from public.membership_plans where name = 'Daily Coffee' and business_id = v_coffee_biz_id;

-- ============================================================================
-- 13. Demo memberships
-- ============================================================================
insert into public.memberships (id, business_id, customer_id, plan_id, status, start_date, end_date, remaining_credit, remaining_visits, auto_renew)
values
  ('m0000000-0000-0000-0000-000000000001', v_barber_biz_id, v_customer1_id, v_plan2_id, 'active', '2026-05-01', '2026-05-31', 35.00, 0, true),
  ('m0000000-0000-0000-0000-000000000002', v_barber_biz_id, v_customer2_id, v_plan1_id, 'active', '2026-05-05', '2026-06-04', 0, 0, false),
  ('m0000000-0000-0000-0000-000000000003', v_barber_biz_id, v_customer3_id, v_plan3_id, 'active', '2026-01-15', '2027-01-15', 80.00, 0, false),
  ('m0000000-0000-0000-0000-000000000004', v_coffee_biz_id, v_customer4_id, v_plan4_id, 'active', '2026-05-01', '2026-05-31', 0, 0, true)
on conflict (id) do nothing;

select id into v_membership1_id from public.memberships where id = 'm0000000-0000-0000-0000-000000000001';
select id into v_membership2_id from public.memberships where id = 'm0000000-0000-0000-0000-000000000002';
select id into v_membership3_id from public.memberships where id = 'm0000000-0000-0000-0000-000000000003';

-- Membership usage
insert into public.membership_usage (id, business_id, membership_id, customer_id, booking_id, usage_type, amount_used, visits_used, notes)
values
  ('mu000000-0000-0000-0000-000000000001', v_barber_biz_id, v_membership1_id, v_customer1_id, v_booking4_id, 'credit', 15.00, 0, 'Haircut paid from premium credit — RM25, RM10 top-up'),
  ('mu000000-0000-0000-0000-000000000002', v_barber_biz_id, v_membership3_id, v_customer3_id, null, 'visit', 0, 0, 'Manual registration')
on conflict (id) do nothing;

-- ============================================================================
-- 14. Demo products
-- ============================================================================
-- Barber: retail products
insert into public.products (id, business_id, branch_id, name, category, sku, cost_price, selling_price, stock_quantity, low_stock_threshold)
values
  ('pr000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, 'Pomade Classic', 'Hair Products', 'POM-001', 8.00, 25.00, 30, 5),
  ('pr000000-0000-0000-0000-000000000002', v_barber_biz_id, v_barber_main_branch_id, 'Beard Oil Premium', 'Beard Care', 'BOIL-001', 12.00, 35.00, 15, 3),
  ('pr000000-0000-0000-0000-000000000003', v_barber_biz_id, v_barber_main_branch_id, 'Shaving Cream Set', 'Shaving', 'SHAVE-001', 15.00, 45.00, 8, 2),
  ('pr000000-0000-0000-0000-000000000004', v_barber_biz_id, v_barber_main_branch_id, 'Hair Tonic', 'Hair Products', 'TONIC-001', 6.00, 18.00, 50, 10)
on conflict (id) do nothing;

-- Coffee: F&B products
insert into public.products (id, business_id, branch_id, name, category, sku, cost_price, selling_price, stock_quantity, low_stock_threshold)
values
  ('pr000000-0000-0000-0000-000000000005', v_coffee_biz_id, v_coffee_main_branch_id, 'Signature Latte', 'Beverages', 'LATTE-001', 4.50, 12.00, 999, 50),
  ('pr000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_coffee_main_branch_id, 'Americano', 'Beverages', 'AMER-001', 3.00, 9.00, 999, 50),
  ('pr000000-0000-0000-0000-000000000007', v_coffee_biz_id, v_coffee_main_branch_id, 'Cappuccino', 'Beverages', 'CAPP-001', 4.00, 11.00, 999, 50),
  ('pr000000-0000-0000-0000-000000000008', v_coffee_biz_id, v_coffee_main_branch_id, 'Breakfast Set', 'Food', 'BRK-001', 8.00, 18.00, 50, 10)
on conflict (id) do nothing;

select id into v_product1_id from public.products where sku = 'POM-001';

-- ============================================================================
-- 15. Demo POS orders
-- ============================================================================
-- Barber POS order (completed, paid)
insert into public.pos_orders (id, business_id, branch_id, customer_id, staff_id, order_number, subtotal, discount_amount, tax_amount, total_amount, payment_status, order_status)
values
  ('po000000-0000-0000-0000-000000000001', v_barber_biz_id, v_barber_main_branch_id, v_customer1_id, v_staff1_id, 'POS-BR-20260514-001', 60.00, 0, 0, 60.00, 'paid', 'completed')
on conflict (id) do nothing;

select id into v_order1_id from public.pos_orders where order_number = 'POS-BR-20260514-001';

-- Barber POS order items (haircut service + pomade product)
insert into public.pos_order_items (id, order_id, item_type, item_name, quantity, unit_price, total_price)
values
  ('poi000000-0000-0000-0000-000000000001', v_order1_id, 'service', 'Classic Haircut', 1, 25.00, 25.00),
  ('poi000000-0000-0000-0000-000000000002', v_order1_id, 'product', 'Pomade Classic', 1, 35.00, 35.00)
on conflict (id) do nothing;

-- Coffee POS order (completed, paid)
insert into public.pos_orders (id, business_id, branch_id, customer_id, staff_id, order_number, subtotal, discount_amount, tax_amount, total_amount, payment_status, order_status)
values
  ('po000000-0000-0000-0000-000000000002', v_coffee_biz_id, v_coffee_main_branch_id, v_customer4_id, null, 'POS-CF-20260514-001', 41.00, 4.10, 0, 36.90, 'paid', 'completed')
on conflict (id) do nothing;

select id into v_order2_id from public.pos_orders where order_number = 'POS-CF-20260514-001';

-- Coffee POS order items
insert into public.pos_order_items (id, order_id, item_type, item_name, quantity, unit_price, total_price)
values
  ('poi000000-0000-0000-0000-000000000003', v_order2_id, 'product', 'Signature Latte', 2, 12.00, 24.00),
  ('poi000000-0000-0000-0000-000000000004', v_order2_id, 'product', 'Breakfast Set', 1, 17.00, 17.00)
on conflict (id) do nothing;

-- ============================================================================
-- 16. Demo payments
-- ============================================================================
-- Payment for barber booking #4 (completed haircut)
insert into public.payments (id, business_id, customer_id, reference_type, reference_id, payment_method, amount, status, paid_at, transaction_id)
values
  ('pm000000-0000-0000-0000-000000000001', v_barber_biz_id, v_customer1_id, 'booking', v_booking4_id, 'cash', 25.00, 'paid', now() - interval '3 days', 'CASH-0001'),
  -- Payment for barber POS order #1
  ('pm000000-0000-0000-0000-000000000002', v_barber_biz_id, v_customer1_id, 'pos_order', v_order1_id, 'cash', 60.00, 'paid', now() - interval '2 days', 'CASH-0002'),
  -- Payment for coffee POS order #2
  ('pm000000-0000-0000-0000-000000000003', v_coffee_biz_id, v_customer4_id, 'pos_order', v_order2_id, 'qr', 36.90, 'paid', now() - interval '1 day', 'QR-0001')
on conflict (id) do nothing;

-- ============================================================================
-- 17. Demo loyalty transactions
-- ============================================================================
-- Barber loyalty transactions for John
insert into public.loyalty_transactions (id, business_id, customer_id, transaction_type, points, description, reference_type, balance_after)
values
  ('lt000000-0000-0000-0000-000000000001', v_barber_biz_id, v_customer1_id, 'earn', 50, 'Earned from haircut purchase', 'payment', 50),
  ('lt000000-0000-0000-0000-000000000002', v_barber_biz_id, v_customer1_id, 'earn', 100, 'Earned from Premium Grooming signup', 'payment', 150),
  ('lt000000-0000-0000-0000-000000000003', v_barber_biz_id, v_customer1_id, 'earn', 300, 'Earned from POS order #POS-BR-20260514-001', 'payment', 450),
  ('lt000000-0000-0000-0000-000000000004', v_barber_biz_id, v_customer2_id, 'earn', 50, 'Welcome bonus points', 'payment', 50),
  ('lt000000-0000-0000-0000-000000000005', v_barber_biz_id, v_customer2_id, 'earn', 160, 'Earned from visits', 'payment', 210)
on conflict (id) do nothing;

-- Coffee loyalty transactions for Lisa
insert into public.loyalty_transactions (id, business_id, customer_id, transaction_type, points, description, reference_type, balance_after)
values
  ('lt000000-0000-0000-0000-000000000006', v_coffee_biz_id, v_customer4_id, 'earn', 50, 'Welcome bonus', 'payment', 50),
  ('lt000000-0000-0000-0000-000000000007', v_coffee_biz_id, v_customer4_id, 'earn', 80, 'Earned from visits', 'payment', 130),
  ('lt000000-0000-0000-0000-000000000008', v_coffee_biz_id, v_customer4_id, 'earn', 50, 'Earned from Coffee Lover signup', 'payment', 180),
  ('lt000000-0000-0000-0000-000000000009', v_coffee_biz_id, v_customer5_id, 'earn', 90, 'Earned from visits', 'payment', 90)
on conflict (id) do nothing;

-- ============================================================================
-- 18. Demo rewards
-- ============================================================================
insert into public.rewards (id, business_id, name, description, reward_type, points_required, discount_amount, discount_percent, free_item, is_active)
values
  ('rw000000-0000-0000-0000-000000000001', v_barber_biz_id, 'Free Hair Wash', 'Redeem a complimentary hair wash with every haircut', 'free_service', 100, null, null, null, true),
  ('rw000000-0000-0000-0000-000000000002', v_barber_biz_id, 'RM5 Discount', 'Get RM5 off any service', 'discount', 100, 5.00, null, null, true),
  ('rw000000-0000-0000-0000-000000000003', v_barber_biz_id, 'Free Pomade', 'Redeem a free Classic Pomade', 'free_item', 200, null, null, 'Classic Pomade', true),
  ('rw000000-0000-0000-0000-000000000004', v_coffee_biz_id, 'Free Latte', 'Redeem a free Signature Latte', 'free_item', 100, null, null, 'Signature Latte', true),
  ('rw000000-0000-0000-0000-000000000005', v_coffee_biz_id, 'RM3 Discount', 'Get RM3 off your bill', 'discount', 80, 3.00, null, null, true)
on conflict (id) do nothing;

-- ============================================================================
-- Loyalty settings per business
-- ============================================================================
insert into public.loyalty_settings (business_id, earning_rate, redemption_rate, redemption_discount_amount, birthday_reward_points, referral_reward_points)
values
  (v_barber_biz_id, 1.0, 100, 5.0, 100, 200),
  (v_coffee_biz_id, 1.0, 100, 5.0, 100, 200)
on conflict (business_id) do nothing;

-- ============================================================================
-- Notification templates (seed defaults)
-- ============================================================================
-- Insert 5 essential templates for barber
insert into public.notification_templates (business_id, template_key, name, channel, subject, body, variables)
select v_barber_biz_id, 'booking_confirmation', 'Booking Confirmation', 'email', 'Your booking at Classic Barber House is confirmed', 'Hi {{customer_name}}, your {{service_name}} booking on {{booking_date}} at {{booking_time}} with {{staff_name}} is confirmed. Thank you!', '["customer_name","service_name","booking_date","booking_time","staff_name","business_name"]'::jsonb
where exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notification_templates')
on conflict (business_id, template_key, channel) do nothing;

insert into public.notification_templates (business_id, template_key, name, channel, subject, body, variables)
select v_barber_biz_id, 'booking_reminder', 'Booking Reminder', 'email', 'Reminder: Upcoming booking tomorrow', 'Hi {{customer_name}}, this is a reminder for your {{service_name}} booking tomorrow at {{booking_time}}. See you at Classic Barber House!', '["customer_name","service_name","booking_time","business_name"]'::jsonb
where exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notification_templates')
on conflict (business_id, template_key, channel) do nothing;

insert into public.notification_templates (business_id, template_key, name, channel, subject, body, variables)
select v_barber_biz_id, 'membership_expiry', 'Membership Expiry Warning', 'email', 'Your membership is expiring soon', 'Hi {{customer_name}}, your {{membership_name}} membership will expire on {{expiry_date}}. Renew now to keep enjoying your benefits!', '["customer_name","membership_name","expiry_date","business_name"]'::jsonb
where exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notification_templates')
on conflict (business_id, template_key, channel) do nothing;

-- ============================================================================
-- Auth users (for demo login)
-- ============================================================================
-- These need to exist in auth.users for Supabase Auth to work.
-- We create them here (Supabase managed Postgres allows this).
-- Encrypted password for all: Demo@123456
-- The bcrypt hash below corresponds to "Demo@123456"
-- Generated with: select crypt('Demo@123456', gen_salt('bf'));
-- Note: If auth.users insert fails, create users manually via Supabase dashboard or auth.admin API.

-- We use a do block with exception handling since auth schema may have restrictions
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_user_meta_data, created_at, updated_at)
  values
    ('au000000-0000-0000-0000-000000000001', 'barber_owner@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Ahmad Barber","role":"owner","business_name":"Classic Barber House","business_type":"barber_shop"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000002', 'coffee_owner@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Mei Ling Coffee","role":"owner","business_name":"Brew & Bean Cafe","business_type":"coffee_shop"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000003', 'staff1@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Ahmad Bin Ismail","role":"staff"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000004', 'staff2@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Siti Binti Rahman","role":"staff"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000005', 'customer1@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"John Tan","role":"customer"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000006', 'customer2@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Sarah Lim","role":"customer"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000007', 'customer3@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"David Chong","role":"customer"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000008', 'customer4@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Lisa Wong","role":"customer"}'::jsonb, now(), now()),
    ('au000000-0000-0000-0000-000000000009', 'customer5@demo.com', crypt('Demo@123456', gen_salt('bf')), now(), now(), '{"full_name":"Adam Malik","role":"customer"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  -- Create identities for the users so they can sign in
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  select id, id, jsonb_build_object('sub', id, 'email', email), 'email', email, now(), now(), now()
  from auth.users
  where email in ('barber_owner@demo.com', 'coffee_owner@demo.com', 'staff1@demo.com', 'staff2@demo.com', 'customer1@demo.com', 'customer2@demo.com', 'customer3@demo.com', 'customer4@demo.com', 'customer5@demo.com')
  on conflict (provider_id, provider) do nothing;
exception when others then
  raise notice 'Auth user creation skipped (may need Supabase dashboard): %', SQLERRM;
end;

-- Insert user_profiles for auth users (linking them to businesses)
insert into public.user_profiles (id, business_id, branch_id, full_name, email, role, status)
select u.id, b.id, null, u.raw_user_meta_data->>'full_name', u.email, u.raw_user_meta_data->>'role', 'active'
from auth.users u
join public.businesses b on b.email = u.email
where u.email in ('barber_owner@demo.com', 'coffee_owner@demo.com')
  and not exists (select 1 from public.user_profiles up where up.id = u.id)
on conflict (id) do nothing;

-- Staff user_profiles
insert into public.user_profiles (id, business_id, branch_id, full_name, email, role, status)
select u.id, s.business_id, s.branch_id, s.full_name, u.email, 'staff', 'active'
from auth.users u
join public.staff s on s.email = u.email
where u.email in ('staff1@demo.com', 'staff2@demo.com')
  and not exists (select 1 from public.user_profiles up where up.id = u.id)
on conflict (id) do nothing;

-- Customer user_profiles + link to customers table
insert into public.user_profiles (id, business_id, branch_id, full_name, email, role, status)
select u.id, c.business_id, c.branch_id, c.full_name, u.email, 'customer', 'active'
from auth.users u
join public.customers c on c.email = u.email
where u.email in ('customer1@demo.com', 'customer2@demo.com', 'customer3@demo.com', 'customer4@demo.com', 'customer5@demo.com')
  and not exists (select 1 from public.user_profiles up where up.id = u.id)
on conflict (id) do nothing;

-- Link customers to their auth user
update public.customers c
set user_id = up.id
from public.user_profiles up
where up.email = c.email
  and c.user_id is null;

-- ============================================================================
-- Done
-- ============================================================================
raise notice 'Phase 22 seed data applied successfully.';
end $$;
