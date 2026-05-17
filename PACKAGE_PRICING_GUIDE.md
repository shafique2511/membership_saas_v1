# Package Pricing Guide

## Package Model

Packages are defined in `public.packages` and connected to module access through `public.package_modules`.

Seeded packages:

- `starter`
- `growth`
- `pro`
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

Enterprise:

- Full module set
- Multi-branch
- White label
- Highest or unlimited limits
- Manual commercial terms if needed

## Add-ons

Use add-ons when a business needs one module without upgrading the full package. Add-ons should create or update `business_module_access` with `source = 'addon'`.

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

## Billing Notes

This codebase stores subscriptions, invoices, payments, refunds, and receipts, but external payment gateway settlement must be configured separately before real billing. Do not mark online payments as final until gateway webhooks or trusted verification are implemented.
