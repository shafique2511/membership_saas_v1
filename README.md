# Luxantara Members

Production-ready React and Supabase application for appointment and counter-sales businesses that need bookings, memberships, loyalty, POS, inventory, payments, notifications, reviews, reporting, customer portal, package limits, demo mode, audit logs, backups, shutdown mode, and tenant isolation.

## Stack

- React 19, TypeScript, Vite
- Supabase Auth, Postgres, RLS, RPC functions, SQL migrations
- Tailwind CSS 4
- Vitest, Testing Library, ESLint

## Main Areas

- Super admin: packages, modules, add-ons, businesses, subscriptions, usage, audit logs, legal pages, system health, design system, backups, shutdown mode, and platform settings
- Business app: dashboard, mobile owner view, bookings, memberships, loyalty, POS, inventory, staff, branches, payments, notifications, marketing, AI assistant, reviews, reports, upgrade flow, data export, and settings
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
- [DATA_OWNERSHIP_POLICY.md](./DATA_OWNERSHIP_POLICY.md)
- [BACKUP_AND_SHUTDOWN_GUIDE.md](./BACKUP_AND_SHUTDOWN_GUIDE.md)
- [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)
- [BUSINESS_ONBOARDING_GUIDE.md](./BUSINESS_ONBOARDING_GUIDE.md)
- [USER_GUIDE.md](./USER_GUIDE.md)
- [DATA_OWNERSHIP_BACKUP_POLICY.md](./DATA_OWNERSHIP_BACKUP_POLICY.md)

## SQL Deliverables

- Complete schema: `supabase/migrations/*.sql`, applied in filename order
- Complete seed data: `supabase/seed/*.sql`, applied after migrations
- RLS policies: embedded in the migration files, especially `supabase/migrations/202605160001_phase_2_schema.sql` and later module migrations
- Staff permission hardening: `supabase/migrations/202605170001_phase_24_staff_permission_hardening.sql`
- Data ownership module: `supabase/migrations/202605170002_phase_25_data_ownership_backup.sql`
- Backup and shutdown: `supabase/migrations/202605200001_phase_27_data_backup_shutdown_policy.sql`
- Reviews: `supabase/migrations/202605200003_phase_29_review_collection_system.sql`
- Demo mode: `supabase/migrations/202605200004_phase_32_demo_mode.sql`
- Audit logs: `supabase/migrations/202605200005_phase_35_audit_logs.sql`
- Legal pages: `supabase/migrations/202605200006_phase_36_legal_pages.sql`
- System health: `supabase/migrations/202605200007_phase_37_system_health.sql`
- Production validation tests: `src/__tests__/**/*.test.ts` and `src/__tests__/**/*.test.tsx`

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
- Owner backup/export button exists in Business Settings > Data & Backup
- Super admin backup, shutdown, legal, system health, and audit views exist under `/admin`

## Final Deliverables

- Full working source code: `src/`
- Complete Supabase SQL schema and RLS: `supabase/migrations/`
- Complete seed data: `supabase/seed/`
- Complete frontend pages: `src/pages/`
- Complete module permission system: `src/services/permissions.ts`, `src/components/auth/ModuleRoute.tsx`, and module migrations
- Complete package system: `src/services/packageCatalog.ts`, `src/services/packageSystem.ts`, and package seed files
- Owner backup button: `src/pages/business/settings/DataOwnershipPage.tsx`
- Super admin backup system and shutdown mode: `src/pages/admin/BackupHistoryPage.tsx`, `src/pages/admin/ShutdownModePage.tsx`
- Setup, deployment, and user guides: root documentation files

## Notes

Do not expose Supabase service role keys in this frontend. The app uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; privileged work must be done through Supabase SQL, Edge Functions, or server-side tooling.
