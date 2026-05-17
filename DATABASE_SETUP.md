# Database Setup

## Required Order

Apply every migration in `supabase/migrations` by filename order:

```text
202605160001_phase_2_schema.sql
202605160002_phase_3_staff_invitations.sql
202605160003_phase_3_auth_triggers.sql
202605160004_phase_4_package_module_system.sql
202605160005_phase_5_super_admin.sql
202605160006_phase_8_membership.sql
202605160007_phase_9_loyalty.sql
202605160008_phase_10_pos.sql
202605160009_phase_11_inventory.sql
202605160010_phase_12_staff.sql
202605160011_phase_13_payment.sql
202605160012_phase_14_notification.sql
202605160013_phase_16_marketing.sql
202605160014_phase_17_multi_branch.sql
202605160015_phase_18_customer_portal.sql
202605160016_phase_19_white_label.sql
202605160017_phase_20_settings.sql
202605170001_phase_24_staff_permission_hardening.sql
```

Then apply seed files:

```text
supabase/seed/phase_2_seed.sql
supabase/seed/phase_4_package_rules.sql
supabase/seed/202605170001_phase_22_seed_data.sql
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

## Seed Data

Seed files include:

- Package catalog and package-module mappings
- Module definitions
- Demo tenants, staff, customers, services, bookings, memberships, products, orders, payments, notifications, and reports data

Before using production, either remove demo seed rows or create a clean production seed with only packages, modules, and pricing rules.

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

Run the validation SQL after applying seeds:

```text
src/__tests__/validation.sql
```

It checks tenant isolation, package/module access, referential integrity, booking overlaps, membership balances, POS totals, stock, payments, and loyalty ledger consistency.
