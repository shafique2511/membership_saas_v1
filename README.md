# Membership SaaS

Production-ready React and Supabase application for appointment-based businesses that need bookings, memberships, loyalty, POS, inventory, payments, notifications, reporting, customer portal, package limits, and tenant isolation.

## Stack

- React 19, TypeScript, Vite
- Supabase Auth, Postgres, RLS, RPC functions, SQL migrations
- Tailwind CSS 4
- Vitest, Testing Library, ESLint

## Main Areas

- Super admin: packages, modules, add-ons, businesses, subscriptions, usage, audit logs, platform settings
- Business app: dashboard, bookings, memberships, loyalty, POS, inventory, staff, branches, payments, notifications, marketing, reports, settings
- Customer portal: public business page, booking, memberships, rewards, points, booking history, payment history, profile
- Security: role-based routes, module-gated URLs, tenant-scoped Supabase RLS, customer self-access policies
- Delegated permissions: owners can grant managers permission to manage individual staff module access

## Quick Start

1. Install dependencies:

```powershell
npm install
```

2. Create `.env.local` from `.env.example` and fill Supabase values:

```powershell
Copy-Item .env.example .env.local
```

3. Apply database migrations and seed data in order. See [DATABASE_SETUP.md](./DATABASE_SETUP.md).

4. Start development:

```powershell
npm run dev
```

5. Validate before deploying:

```powershell
npm run lint
npm run test
npm run build
```

## Required Documentation

- [ENV_SETUP.md](./ENV_SETUP.md)
- [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- [SUPABASE_RLS_GUIDE.md](./SUPABASE_RLS_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [MODULE_SYSTEM_GUIDE.md](./MODULE_SYSTEM_GUIDE.md)
- [PACKAGE_PRICING_GUIDE.md](./PACKAGE_PRICING_GUIDE.md)
- [USER_GUIDE.md](./USER_GUIDE.md)
- [DATA_OWNERSHIP_BACKUP_POLICY.md](./DATA_OWNERSHIP_BACKUP_POLICY.md)

## SQL Deliverables

- Complete schema: `supabase/migrations/*.sql`, applied in filename order
- Seed data: `supabase/seed/phase_2_seed.sql`, `supabase/seed/phase_4_package_rules.sql`, `supabase/seed/202605170001_phase_22_seed_data.sql`
- RLS policies: embedded in the migration files, especially `supabase/migrations/202605160001_phase_2_schema.sql` and later module migrations
- Staff permission hardening: `supabase/migrations/202605170001_phase_24_staff_permission_hardening.sql`
- Data ownership module: `supabase/migrations/202605170002_phase_25_data_ownership_backup.sql`
- Validation SQL: `src/__tests__/validation.sql`

## Production Readiness Checklist

- TypeScript build passes with `npm run build`
- Unit/service validation passes with `npm run test`
- Lint passes with `npm run lint`
- Production build fails fast if Supabase URL or anon key is missing
- RLS is enabled on tenant tables and checked through helper functions
- Module access is enforced in React routes and database policies
- Individual staff module access is enforced after business package/module access
- Usage limits are represented by package module config and usage counters
- Mobile layouts use responsive navigation and customer portal pages
- Dark mode classes are present across shared UI and layouts

## Notes

Do not expose Supabase service role keys in this frontend. The app uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; privileged work must be done through Supabase SQL, Edge Functions, or server-side tooling.
