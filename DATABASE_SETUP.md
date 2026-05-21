# Database Setup

## Required Order

Apply every migration in `supabase/migrations` by filename order. Do not skip later phase files; they add production features, RLS hardening, indexes, audit logs, demo mode, legal pages, and system health tables.

Use the file list from the folder itself:

```powershell
Get-ChildItem supabase\migrations -File | Sort-Object Name | Select-Object Name
```

Then apply seed files:

```text
supabase/seed/phase_2_seed.sql
supabase/seed/phase_4_package_rules.sql
supabase/seed/202605170001_phase_22_seed_data.sql
supabase/seed/202605210001_phase_39_seed_data.sql
```

## Supabase SQL Editor Setup

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run the migration files in the exact order above.
4. Run seed files in the exact order above.
5. Open Authentication > URL Configuration and set site URL plus redirect URLs.
6. Create initial users through Auth or the app registration flow.
7. Promote the platform admin using the super admin setup in this guide.

## Supabase CLI Setup

If this repository is connected to a Supabase project:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

For seed data, run the SQL seed files through SQL Editor or `psql` after migrations.

## Complete Schema

The complete schema is the ordered set of migration files in `supabase/migrations`. These files include:

- Extensions and utility functions
- Tables, indexes, constraints, and triggers
- Authentication profile triggers
- Package, module, add-on, and usage limit tables
- Booking, membership, loyalty, POS, inventory, staff, payment, notification, marketing, branch, customer portal, white label, and settings tables
- RLS enablement and policies
- RPC functions used by service code
- Delegated manager and individual staff permission functions
- Data ownership export logs, platform backup logs, backup requests, backup downloads, shutdown settings, shutdown notice tracking, review collection, demo mode flags, audit logs, legal pages, and system health tables

## Seed Data

Seed files include:

- Package catalog and package-module mappings
- Module definitions
- Demo tenants, staff, customers, services, bookings, memberships, products, orders, payments, notifications, and reports data

Before using production, either skip demo seed rows or create a clean production seed with only packages, modules, and pricing rules. The Phase 39 seed is safe and idempotent, but it intentionally creates demo businesses and realistic demo records.

## Admin Setup

1. Register or create an Auth user for the platform admin.
2. Ensure a matching `public.user_profiles` row exists.
3. Set that profile role to `super_admin`.
4. Confirm `/admin` is accessible after login.
5. Use `/admin/packages` and `/admin/modules` to review package access.

Example SQL:

```sql
update public.user_profiles
set role = 'super_admin'
where email = 'admin@example.com';
```

Run this only from a trusted SQL console.

## Backup Notes

- Enable Supabase automated daily backups for production.
- Before major migrations, create a manual backup or point-in-time recovery checkpoint.
- Export package and module configuration before pricing changes.
- Store business-critical exports, receipts, and invoices outside the database if long-term archival is required.
- Test restore flow on a staging project at least once per release cycle.

## Validation

This repo uses Vitest service/static validation instead of a live SQL validation file:

```powershell
npm run test
npm run build
```

The tests check tenant isolation, package/module access, locked module behavior, booking overlaps, membership balances, POS stock/payment flows, loyalty points, reports, customer portal isolation, backup/export scoping, shutdown guards, RLS policy presence, seed integrity, mobile shell behavior, and audit-log rules.
