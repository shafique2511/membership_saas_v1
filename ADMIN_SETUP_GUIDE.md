# Admin Setup Guide

## First Super Admin

Create the first super admin only after the production Supabase project is configured.

Recommended process:

1. Create the admin user through Supabase Auth.
2. Add or update the matching profile row with the super admin role.
3. Login at `/auth/login`.
4. Open `/admin`.
5. Confirm businesses, packages, modules, usage, audit logs, data governance, legal pages, and system health load correctly.

Keep the number of super admins small. Review access before every production launch.

## Platform Configuration

Before onboarding businesses:

- Apply all migrations in `supabase/migrations`.
- Apply package and module seed data.
- Apply demo seed data only when sales demo access is required.
- Confirm RLS is enabled on tenant tables.
- Configure Auth site URL and redirect URLs.
- Configure database backups.
- Review legal page templates.
- Confirm shutdown mode is disabled for production launch.

## Package and Module Setup

1. Review packages in `/admin`.
2. Confirm module access for Starter, Growth, Pro, Business Suite, and Enterprise.
3. Confirm locked modules are hidden from sidebar navigation.
4. Open `/business/upgrade` from a test business and verify package comparison.
5. Confirm add-ons create business module access without changing unrelated modules.

## Business Onboarding

For each real business:

1. Create the business record and owner profile.
2. Assign the correct package.
3. Configure branches, services, staff, memberships, products, and payment settings.
4. Set staff permissions.
5. Test booking, membership, POS, payment, loyalty, customer portal, reports, reviews, and backup export.
6. Test mobile owner workflows.
7. Confirm business data does not appear in another business account.

## Operational Review

Weekly production checks:

- Failed payments
- Failed notifications
- Recent failed jobs
- Backup status
- System health indicators
- Audit logs for sensitive changes
- Usage counters near package limits
- Low-rated reviews or customer feedback trends
