# Module System Guide

## Purpose

The module system controls which product areas a business can use. It supports package entitlements, add-ons, trials, manual overrides, usage limits, and locked URL protection.

User access is intentionally narrower than business access:

```text
Can use module =
business package/add-on enables module
AND user role is allowed
AND individual staff permission allows it when the user is staff
```

## Core Tables

- `public.modules`: module catalog
- `public.packages`: pricing package catalog
- `public.package_modules`: package-to-module entitlement rules
- `public.business_subscriptions`: business package subscription
- `public.business_module_access`: effective module access per business
- `public.business_addons`: paid or manual add-ons
- `public.usage_counters`: current usage against configured limits
- `public.staff_permissions`: owner-managed role permissions for managers and staff
- `public.staff_user_permissions`: owner/authorized-manager managed permissions for individual staff users

## Module Keys

```text
core
booking
membership
loyalty
pos
inventory
staff_commission
payment
notification
reports
marketing
multi_branch
customer_portal
white_label
```

## Frontend Enforcement

Business and customer routes are wrapped by `ModuleRoute` in `src/App.tsx`. Sidebar entries also include module metadata so locked modules are hidden from navigation.

URL access is still checked. A user entering a locked module URL directly should see the module lock/upgrade experience instead of the page.

Navigation also uses user-level module checks, so staff only see modules they can access.

## Database Enforcement

Supabase RLS and triggers call:

```sql
public.has_module_access(business_id, 'module_key')
```

This protects data access even if a user bypasses the UI.

Managers can manage individual staff permissions only when the owner grants `staff.permissions.manage` to the manager role. Managers cannot grant owner-only permissions or edit manager permissions.

## Access Sources

`business_module_access.source` can be:

- `package`: granted by subscription package
- `addon`: granted by paid add-on
- `trial`: temporary trial access
- `manual`: admin override

## Adding a Module

1. Add the module key to the `modules` table constraint in a migration.
2. Seed the module in `supabase/seed/phase_2_seed.sql` or a new seed.
3. Add package rules to `package_modules`.
4. Add frontend route protection with `ModuleRoute`.
5. Add navigation metadata in `src/components/layout/navigation.ts`.
6. Add RLS checks to new database tables.
7. Add tests for locked URL behavior and service access.
8. Add a permission key and map it in `modulePermissionMap` and `public.module_permission_key`.

## Usage Limits

Limits live in `package_modules.limit_config` and effective business access rows. Typical keys:

- `branches`
- `staff`
- `customers`
- `bookings_per_month`
- `products`
- `notifications_per_month`

Use `usage_counters` to track period usage. New write actions should check the relevant counter before creating rows.

## Operational Review

Before changing a package-module rule:

1. Export current package rules.
2. Confirm affected businesses.
3. Apply the package rule update.
4. Refresh or recalculate `business_module_access` rows.
5. Test one affected owner account.
