# Deployment Guide

## Preflight

Run locally:

```powershell
npm run lint
npm run test
npm run build
```

All three commands must pass before deployment.

## Build

```powershell
npm install
npm run build
```

The static output is written to `dist/`.

## Environment Variables

Set these in the hosting provider:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_DEFAULT_CUSTOMER_BUSINESS_ID=
```

See [ENV_SETUP.md](./ENV_SETUP.md).

## Hosting

Any static host that supports SPA fallback can serve this app.

Required settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or newer
- SPA fallback: route all unknown paths to `/index.html`

## Supabase Production Setup

1. Apply all migrations.
2. Apply production seed or package/module seed only.
3. Configure Auth site URL and redirect URLs.
4. Enable email provider settings.
5. Configure backups.
6. Create or promote the first super admin.
7. Validate RLS with `src/__tests__/validation.sql`.
8. Verify the Data Ownership & Backup module exists and is enabled for active businesses.

## Smoke Test

After deployment:

1. Load `/auth/login`.
2. Login as super admin and open `/admin`.
3. Login as a business owner and open `/business`.
4. Try a locked module URL for a package that does not include it.
5. Create a booking and confirm it appears in reports.
6. Complete a POS sale and confirm stock changes.
7. Login as a customer and confirm only own data is visible.
8. Test mobile viewport for dashboard, booking, POS, and customer portal.
9. Toggle dark mode if enabled by layout/theme controls or system preference.

## Performance Notes

- Keep reports filtered by date range.
- Add indexes for any new high-volume tenant queries.
- Avoid loading all historical rows into list pages.
- Prefer paginated tables for payments, orders, notifications, and audit logs.
- Use Supabase query filters before client-side filtering.
- Watch bundle size after adding charting or payment SDKs.

## Rollback

- Keep the previous deployment available in the hosting provider.
- For database changes, use Supabase point-in-time recovery or a manual backup.
- Do not run destructive migrations without a restore plan.
- Treat package/pricing changes as configuration changes and export current package mappings before edits.
- Log full platform backups in `/admin/data-governance` and keep backup files outside the frontend deployment.
