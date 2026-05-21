# Backup and Shutdown Guide

## Purpose

This guide explains how owner exports, super admin backups, and shutdown mode should be handled before production launch.

## Owner Business Export

Owners use Settings > Data & Backup to export their own business data.

Expected behavior:

- Export only includes the current `business_id`.
- Export requires the Data Ownership & Backup module.
- Export actions are logged.
- Customers, bookings, memberships, POS orders, payments, loyalty records, reviews, and audit records remain tenant-scoped.

Recommended owner workflow:

1. Open Settings > Data & Backup.
2. Review the data ownership notice.
3. Request or download the business export.
4. Store the exported file securely.
5. Confirm the export log appears for the business.

## Super Admin Platform Backup

Super admins use the platform data governance area to review or run platform-level backup operations.

Expected behavior:

- Only super admins can access platform backup records.
- Backup status, file metadata, and download activity are logged.
- Backup files should be stored outside the frontend deployment.
- Failed backups should be investigated before the next production release.

## Database Backup Notes

- Enable Supabase scheduled backups for production.
- Keep point-in-time recovery enabled when available.
- Export package, module, and business access configuration before pricing changes.
- Test restore procedures in a non-production project.
- Do not run destructive migrations without a verified restore path.

## Shutdown Policy

If Luxantara Members is discontinued, we will make reasonable efforts to notify business owners and provide time to download business data before service closure.

Shutdown mode should:

- Be controlled only by super admins.
- Show clear user-facing maintenance or closure messaging.
- Preserve login and export access when possible.
- Prevent new operational activity if the platform is closing.
- Log the admin user, reason, status, and timestamp.

## Shutdown Checklist

1. Create a fresh platform backup.
2. Verify owner export access.
3. Notify affected businesses.
4. Enable shutdown mode with a clear message.
5. Keep exports available for the announced period.
6. Record all shutdown and backup actions in audit logs.
