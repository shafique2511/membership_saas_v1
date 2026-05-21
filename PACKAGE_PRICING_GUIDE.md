# Package Pricing Guide

## Package Model

Packages are defined in `public.packages` and connected to module access through `public.package_modules`.

Seeded packages:

- `starter`
- `growth`
- `pro`
- `business_suite`
- `enterprise`

Exact prices and limits are defined in:

- `supabase/seed/phase_2_seed.sql`
- `supabase/seed/phase_4_package_rules.sql`

## Common Package Shape

Starter:

- Core business system
- Booking
- Membership basics
- Limited customers, staff, and branches

Growth:

- Starter capabilities
- Loyalty
- Payment
- Reports
- Customer portal
- Higher limits

Pro:

- Growth capabilities
- POS
- Inventory
- Staff commission
- Notifications
- Marketing
- More advanced limits

Business Suite:

- Pro capabilities
- Reviews
- Financial summary
- Demo mode for sales walkthroughs
- Audit log visibility
- Mobile owner workflows
- Data ownership and backup

Enterprise:

- Full module set
- Multi-branch
- White label
- AI assistant
- System health and advanced admin support
- Highest or unlimited limits
- Manual commercial terms if needed

## Add-ons

Use add-ons when a business needs one module without upgrading the full package. Add-ons should create or update `business_module_access` with `source = 'addon'`.

## Locked Module Sales Flow

Locked modules should not appear as broken pages. When a user reaches a locked feature, show:

- Feature name
- Required package
- Upgrade benefits
- Package comparison button
- Contact support button
- Upgrade plan button

The upgrade page is `/business/upgrade`. Sidebar navigation should only show enabled modules; locked modules belong in the upgrade page and package comparison.

## Pricing Change Workflow

1. Update package rows in `public.packages`.
2. Update package-module rules in `public.package_modules`.
3. Recalculate affected `business_module_access` rows.
4. Review active subscriptions and renewal dates.
5. Communicate changes before billing impact.
6. Validate locked and unlocked modules from an affected owner account.

## Usage Limit Enforcement

Limits are configured as JSON in `limit_config`. Example:

```json
{"customers": 500, "staff": 3, "branches": 1}
```

Business actions that create limited resources should:

1. Load the effective limit.
2. Load or increment `usage_counters`.
3. Block the action when `used_count >= limit_count`.
4. Show an upgrade prompt.

Common limit keys:

- `customers`
- `staff`
- `branches`
- `bookings_per_month`
- `whatsapp_messages_per_month`
- `storage_mb`

## Billing Notes

This codebase stores subscriptions, invoices, payments, refunds, and receipts, but external payment gateway settlement must be configured separately before real billing. Do not mark online payments as final until gateway webhooks or trusted verification are implemented.
