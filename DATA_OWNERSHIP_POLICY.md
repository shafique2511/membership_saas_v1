# Data Ownership Policy

This is a template operational policy, not final legal advice. Review it with legal counsel before publishing it as a binding customer agreement.

## Ownership Notice

Your business data belongs to you. Luxantara Members only stores and processes your data to provide the service. You can export your business data anytime from Settings > Data & Backup.

## Business Data

Business data includes:

- Business profile and branch records
- Staff records and schedules
- Customer records
- Bookings
- Memberships
- Loyalty points and rewards
- Products, inventory, POS orders, payments, and refunds
- Reviews and customer feedback
- Notification logs
- Reports, audit logs, and backup export logs

## Platform Responsibilities

Luxantara Members should:

- Store tenant data with business-level isolation.
- Enforce Supabase RLS policies on business-owned records.
- Provide owner export tools where the Data Ownership & Backup module is enabled.
- Keep platform backup and shutdown operations restricted to super admins.
- Log important export, backup, and shutdown actions.

## Business Owner Responsibilities

Business owners should:

- Keep exported files secure.
- Limit staff permissions to operational needs.
- Review audit logs for sensitive changes.
- Remove staff access when team members leave.
- Validate customer consent requirements before sending marketing messages.

## Export and Offboarding

Owners can export business data for backup, audit, migration, or offboarding. Exported files may contain personal data, payment history, and customer behavior records, so they should be stored in a secure location.

If a business leaves the platform, the owner should export required data before account closure or data deletion.
