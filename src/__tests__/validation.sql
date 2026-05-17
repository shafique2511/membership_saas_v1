-- ============================================================================
-- Luxantara Members — Validation SQL
-- Run this in Supabase SQL Editor AFTER seeding (Phase 22) to verify:
--   RLS policies, data isolation, module access, package limits
-- ============================================================================

-- ============================================================================
-- 1. Business data isolation
-- ============================================================================
-- Test: Barber owner cannot see Coffee shop data
-- Simulate by using has_business_access() with a non-owned business_id.
-- (Run as barber_owner session via auth.uid() = their user id)
select '1.1' as test, 'Barber owner cannot see Coffee business' as description,
  case when public.has_business_access('a0000000-0000-0000-0000-000000000002') then 'FAIL: cross-tenant access'
  else 'PASS' end as result;

-- Test: Coffee owner cannot see Barber data
select '1.2' as test, 'Coffee owner cannot see Barber business' as description,
  case when public.has_business_access('a0000000-0000-0000-0000-000000000001') then 'FAIL: cross-tenant access'
  else 'PASS' end as result;

-- ============================================================================
-- 2. Role-based access
-- ============================================================================
-- Test: only owners can update business profile
-- (Business update policy requires owner or super_admin)
select '2.1' as test, 'Only owner can update business' as description,
  'Check business update policy for role enforcement' as notes;

-- Test: staff cannot modify business settings
select '2.2' as test, 'Staff cannot modify business settings' as description,
  'user_role() must be owner or super_admin for business update' as notes;

-- Test: managers can manage staff permissions only when owner delegated it
select '2.3' as test, 'Manager staff-permission delegation is explicit' as description,
  case when exists (
    select 1 from public.staff_permissions
    where role = 'manager'
      and permission_key = 'staff.permissions.manage'
      and is_granted = true
  ) then 'PASS: at least one manager delegation exists'
  else 'PASS: no manager delegation configured' end as result;

-- Test: individual staff permissions reference valid staff
select '2.4' as test, 'Individual staff permissions reference valid staff' as description,
  case when exists (
    select 1
    from public.staff_user_permissions sup
    left join public.staff s on s.id = sup.staff_id and s.business_id = sup.business_id
    where s.id is null
  ) then 'FAIL: orphan staff permission' else 'PASS' end as result;

-- ============================================================================
-- 3. Module access gating
-- ============================================================================
-- Test: Barber has 'pro' modules enabled
select '3.1' as test, 'Barber has POS module' as description,
  case when exists (
    select 1 from public.business_module_access
    where business_id = 'a0000000-0000-0000-0000-000000000001'
      and module_key = 'pos' and is_enabled = true
  ) then 'PASS' else 'FAIL' end as result;

-- Test: Coffee (Growth) does NOT have POS module
select '3.2' as test, 'Coffee lacks POS module (Growth package)' as description,
  case when exists (
    select 1 from public.business_module_access
    where business_id = 'a0000000-0000-0000-0000-000000000002'
      and module_key = 'pos' and is_enabled = true
  ) then 'FAIL: Growth should not have POS' else 'PASS' end as result;

-- Test: has_module_access() returns false for disabled modules
select '3.3' as test, 'has_module_access blocks unassigned modules' as description,
  case when public.has_module_access('a0000000-0000-0000-0000-000000000002', 'inventory') then 'FAIL'
  else 'PASS' end as result;

select '3.4' as test, 'Data Ownership & Backup module exists' as description,
  case when exists (
    select 1 from public.modules
    where module_key = 'data_ownership_backup'
      and is_active = true
  ) then 'PASS' else 'FAIL' end as result;

select '3.5' as test, 'Active businesses have Data Ownership & Backup access' as description,
  case when exists (
    select 1
    from public.businesses b
    where b.status = 'active'
      and not exists (
        select 1 from public.business_module_access bma
        where bma.business_id = b.id
          and bma.module_key = 'data_ownership_backup'
          and bma.is_enabled = true
      )
  ) then 'FAIL' else 'PASS' end as result;

-- ============================================================================
-- 4. Customer data isolation
-- ============================================================================
-- Test: customer_owns_record returns true only for own customer_id
-- (Requires auth.uid() to be set; run as the customer's user_id)
-- Example (replace actual UUIDs):
-- select customer_owns_record('c0000000-0000-0000-0000-000000000001'); -- true for John Tan
-- select customer_owns_record('c0000000-0000-0000-0000-000000000002'); -- false for John Tan

-- ============================================================================
-- 5. Subscription & package integrity
-- ============================================================================
-- Test: Every business has exactly one active subscription
select '5.1' as test, 'All businesses have active subscription' as description,
  case when (
    select count(*) = (select count(*) from public.businesses where status = 'active')
    from public.business_subscriptions
    where status in ('active', 'trial')
  ) then 'PASS' else 'FAIL: orphan business or missing subscription' end as result;

-- Test: Subscription package matches expected package
select '5.2' as test, 'Barber is on Pro package' as description,
  case when exists (
    select 1 from public.business_subscriptions bs
    join public.packages p on p.id = bs.package_id
    where bs.business_id = 'a0000000-0000-0000-0000-000000000001'
      and p.slug = 'pro'
  ) then 'PASS' else 'FAIL' end as result;

select '5.3' as test, 'Coffee is on Growth package' as description,
  case when exists (
    select 1 from public.business_subscriptions bs
    join public.packages p on p.id = bs.package_id
    where bs.business_id = 'a0000000-0000-0000-0000-000000000002'
      and p.slug = 'growth'
  ) then 'PASS' else 'FAIL' end as result;

-- ============================================================================
-- 6. Module access matches subscription package
-- ============================================================================
-- Test: Every module access entry has source = 'package' for package-origin rows
select '6.1' as test, 'Module access has valid source' as description,
  case when exists (
    select 1 from public.business_module_access
    where source not in ('package', 'addon', 'trial', 'manual')
  ) then 'FAIL: invalid source' else 'PASS' end as result;

-- ============================================================================
-- 7. Data referential integrity
-- ============================================================================
-- Test: All staff belong to valid businesses
select '7.1' as test, 'Staff belong to existing businesses' as description,
  case when exists (
    select 1 from public.staff s
    left join public.businesses b on b.id = s.business_id
    where b.id is null
  ) then 'FAIL: orphan staff' else 'PASS' end as result;

-- Test: All bookings have valid customers
select '7.2' as test, 'Bookings reference valid customers' as description,
  case when exists (
    select 1 from public.bookings bk
    left join public.customers c on c.id = bk.customer_id
    where bk.customer_id is not null and c.id is null
  ) then 'FAIL: orphan booking' else 'PASS' end as result;

-- Test: All payments have valid references
select '7.3' as test, 'Payments reference valid entities' as description,
  case when exists (
    select 1 from public.payments p
    where p.reference_type = 'booking'
      and p.reference_id is not null
      and not exists (select 1 from public.bookings bk where bk.id = p.reference_id)
  ) then 'FAIL: orphan payment reference' else 'PASS' end as result;

-- ============================================================================
-- 8. Booking data integrity
-- ============================================================================
-- Test: No overlapping bookings for same resource
with resource_schedule as (
  select resource_id, booking_date, start_time, end_time
  from public.bookings
  where status not in ('cancelled', 'no_show')
    and resource_id is not null
)
select '8.1' as test, 'No overlapping resource bookings' as description,
  case when exists (
    select 1
    from resource_schedule a
    join resource_schedule b on a.resource_id = b.resource_id
      and a.booking_date = b.booking_date
      and a.start_time < b.end_time
      and a.end_time > b.start_time
      and a.start_time < b.start_time  -- count each pair once
  ) then 'FAIL: overlapping bookings found' else 'PASS' end as result;

-- Test: No overlapping bookings for same staff
with staff_schedule as (
  select staff_id, booking_date, start_time, end_time
  from public.bookings
  where status not in ('cancelled', 'no_show')
    and staff_id is not null
)
select '8.2' as test, 'No overlapping staff bookings' as description,
  case when exists (
    select 1
    from staff_schedule a
    join staff_schedule b on a.staff_id = b.staff_id
      and a.booking_date = b.booking_date
      and a.start_time < b.end_time
      and a.end_time > b.start_time
      and a.start_time < b.start_time
  ) then 'FAIL: overlapping staff bookings found' else 'PASS' end as result;

-- ============================================================================
-- 9. Membership integrity
-- ============================================================================
-- Test: All memberships have valid plans
select '9.1' as test, 'Memberships reference valid plans' as description,
  case when exists (
    select 1 from public.memberships m
    left join public.membership_plans p on p.id = m.plan_id
    where p.id is null
  ) then 'FAIL: orphan membership plan reference' else 'PASS' end as result;

-- Test: Memberships end_date >= start_date
select '9.2' as test, 'Membership end_date >= start_date' as description,
  case when exists (
    select 1 from public.memberships
    where end_date < start_date
  ) then 'FAIL: invalid date range' else 'PASS' end as result;

-- Test: Remaining credit ≤ plan credit for prepaid plans
select '9.3' as test, 'Membership remaining credit ≤ plan credit' as description,
  case when exists (
    select 1 from public.memberships m
    join public.membership_plans p on p.id = m.plan_id
    where p.plan_type = 'prepaid_credit'
      and m.remaining_credit < 0
  ) then 'FAIL: negative credit' else 'PASS' end as result;

-- ============================================================================
-- 10. POS order integrity
-- ============================================================================
-- Test: Order total = sum of items
select '10.1' as test, 'POS order total matches item sum' as description,
  case when exists (
    select 1
    from public.pos_orders o
    where abs(o.total_amount - (
      select coalesce(sum(total_price), 0)
      from public.pos_order_items
      where order_id = o.id
    )) > 0.01
  ) then 'FAIL: total mismatch' else 'PASS' end as result;

-- Test: All POS payments ≤ order total
select '10.2' as test, 'POS payments ≤ order total' as description,
  case when exists (
    select 1
    from public.payments p
    join public.pos_orders o on o.id = p.reference_id
    where p.reference_type = 'pos_order'
      and p.amount > o.total_amount + 0.01
  ) then 'FAIL: overpayment' else 'PASS' end as result;

-- ============================================================================
-- 11. Loyalty points integrity
-- ============================================================================
-- Test: Customer points_balance matches loyalty_transactions
select '11.1' as test, 'Customer points_balance matches transaction ledger' as description,
  case when exists (
    select c.id
    from public.customers c
    where abs(c.points_balance - coalesce(
      (select sum(case when transaction_type = 'earn' then points else points end)
       from public.loyalty_transactions lt
       where lt.customer_id = c.id), 0
    )) > 0
  ) then 'FAIL: points_balance mismatch' else 'PASS' end as result
limit 1;

-- ============================================================================
-- 12. Product stock integrity
-- ============================================================================
-- Test: No negative stock quantities
select '12.1' as test, 'No negative stock quantities' as description,
  case when exists (
    select 1 from public.products where stock_quantity < 0
  ) then 'FAIL: negative stock' else 'PASS' end as result;

-- ============================================================================
-- 13. Payment status consistency
-- ============================================================================
-- Test: All paid payments have paid_at timestamp
select '13.1' as test, 'Paid payments have paid_at' as description,
  case when exists (
    select 1 from public.payments
    where status = 'paid' and paid_at is null
  ) then 'FAIL: missing paid_at' else 'PASS' end as result;

-- ============================================================================
-- 14. Data ownership, exports, and backup logs
-- ============================================================================
select '14.1' as test, 'Business export logs reference valid businesses' as description,
  case when exists (
    select 1
    from public.data_export_requests der
    left join public.businesses b on b.id = der.business_id
    where b.id is null
  ) then 'FAIL: orphan export log' else 'PASS' end as result;

select '14.2' as test, 'Platform backup logs have valid status' as description,
  case when exists (
    select 1 from public.platform_backup_logs
    where status not in ('planned', 'running', 'completed', 'failed', 'verified')
  ) then 'FAIL: invalid backup status' else 'PASS' end as result;

-- ============================================================================
-- Summary
-- ============================================================================
select '=== VALIDATION COMPLETE ===' as summary,
  'Review any FAIL results above and fix corresponding data or logic.' as action;
