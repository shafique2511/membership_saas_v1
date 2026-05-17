# Data Ownership, Backup & Shutdown Policy

Luxantara Members separates business data ownership from platform ownership.

- Each business owner owns their business data.
- The platform owner owns the platform software, system infrastructure, branding, package catalog, global configuration, and operational tooling.
- The platform owner does not own business customer data.
- The platform stores, processes, and manages business data only to operate the service, provide support, meet legal obligations, perform backups, complete migrations, or manage shutdown.

Business-owned data includes customer profiles, bookings, memberships, loyalty records, POS orders, payments, inventory, staff records, commissions, notifications, marketing records, tenant reports, and tenant exports.

Platform-owned data includes source code, product design, hosting, infrastructure configuration, Luxantara branding, global packages, module catalog, platform billing configuration, platform audit logs, backup logs, and operational tooling.

Each business owner can export their own tenant data from `Business > Settings > Data & Backup`. Exports are JSON files containing tenant-scoped tables and row counts. Export actions are logged in `public.data_export_requests`.

The platform owner may create full platform backups for disaster recovery, hosting migration, legal compliance, restore testing, security incident response, or planned platform shutdown. Full platform backups are privileged operational artifacts and must be created outside browser code using trusted infrastructure or Supabase tooling. Backup actions are logged in `public.platform_backup_logs`.

When a business leaves the platform, support should include a business data export, export structure notes, and reasonable transfer assistance for customers, bookings, memberships, payments, inventory, and loyalty records. The platform is not required to transfer source code, platform-owned infrastructure, or Luxantara branding.

Shutdown procedure:

1. Notify business owners and provide an export window.
2. Create and verify a full platform backup.
3. Freeze destructive changes if needed.
4. Support business owner exports.
5. Retain backups only as long as required by contract, law, compliance, or recovery policy.
6. Securely delete or archive data after the retention period.

Security requirements:

- Never expose service-role keys in frontend code.
- Business exports must remain tenant-scoped.
- Platform backups must be created only by trusted operators.
- Export and backup logs must be retained for auditability.
- RLS must remain enabled on export and backup log tables.
