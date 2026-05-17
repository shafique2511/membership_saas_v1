# Supabase RLS Guide

## Security Model

The app is multi-tenant. Every business-owned row must be scoped by `business_id`, and customer-owned data must be restricted to the authenticated customer unless a business user has tenant access.

Core helper functions are defined in migrations:

- `public.is_super_admin(user_id)`
- `public.user_role(user_id)`
- `public.user_business_id()`
- `public.has_business_access(target_business_id)`
- `public.has_module_access(target_business_id, target_module_key)`
- `public.customer_owns_record(target_customer_id)`
- `public.has_staff_permission(target_business_id, target_permission_key)`
- `public.business_has_module_access(target_business_id, target_module_key)`

## Policy Pattern

Tenant tables use this pattern:

```sql
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id))
```

Module tables add module checks:

```sql
public.has_business_access(business_id)
and public.has_module_access(business_id, 'booking')
```

From Phase 24 onward, `has_module_access` checks both:

- the business package/add-on entitlement
- the current user's owner, customer, manager, role, or individual staff permission

Customer-readable tables allow either tenant staff or the owning customer:

```sql
public.has_business_access(business_id)
or public.customer_owns_record(customer_id)
```

## Important Policies

- Businesses: owners and super admins can update business profile rows.
- User profiles: users can read their own profile; managers and owners can read tenant staff profiles.
- Bookings: staff can access tenant bookings; customers can access their own bookings.
- Memberships and membership usage: tenant staff or owning customer can read; tenant staff writes.
- POS orders and payments: tenant staff or owning customer can read; tenant staff writes.
- Products and inventory transactions: require inventory module access.
- Notifications and marketing: require their matching module.
- Platform settings, packages, modules, and billing controls are super admin managed.
- Role permission changes are owner-only.
- Individual staff permission changes are owner-only unless the owner grants a manager `staff.permissions.manage`.
- Business export logs are tenant-readable and require `data_ownership_backup` plus `data.export`.
- Platform backup logs are super-admin only.

## Locked Module Protection

Modules are protected in two layers:

1. Frontend routes use `ModuleRoute`.
2. Supabase policies and triggers call `has_module_access`.

A user manually entering a locked URL should see the module lock screen or unauthorized state. Direct database reads should return no rows because RLS filters them out.

## Business Isolation Requirements

Production must preserve these invariants:

- Business A cannot select, update, insert, or delete Business B rows.
- Staff cannot update owner-only business settings.
- Customers only see rows linked to their own `customer_id`.
- Staff only use modules they are individually granted, after the business owns the module.
- Managers can assign staff module permissions only when the owner delegates staff permission management.
- Super admins can manage platform-level data but should still use admin UI for auditability.

## RLS Validation

Run:

```sql
select public.has_business_access('TARGET_BUSINESS_UUID');
select public.has_module_access('TARGET_BUSINESS_UUID', 'pos');
select public.customer_owns_record('TARGET_CUSTOMER_UUID');
```

Use `src/__tests__/validation.sql` after seed data to check common policy and data-integrity assumptions.

## Production Hardening

- Keep RLS enabled on every tenant table.
- Do not create broad `authenticated using (true)` policies for tenant data.
- Keep service role usage outside the browser.
- Review every new table for `business_id`, RLS enablement, indexes, and policies before release.
- Prefer RPC functions for multi-step writes that must be atomic.
