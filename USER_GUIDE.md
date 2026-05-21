# User Guide

## Super Admin

Use `/admin` to manage the platform.

Main tasks:

- Review businesses and subscriptions.
- Configure packages and modules.
- Manage add-ons.
- Review billing invoices and payments.
- Inspect usage counters.
- Review audit logs.
- Review system health.
- Manage template legal pages.
- Review platform backups.
- Control shutdown mode if the platform must be paused.
- Manage platform settings.

Super admins should avoid editing tenant data directly unless fixing an operational issue.

## Business Owner

Use `/business` after login.

Recommended onboarding:

1. Complete business profile.
2. Configure branches if applicable.
3. Add services.
4. Add staff and schedules.
5. Create membership plans.
6. Configure loyalty settings and rewards.
7. Add products before using POS and inventory.
8. Configure payment settings.
9. Configure notification templates.
10. Test customer portal booking flow.
11. Review upgrade page and package limits.
12. Export a business backup before launch.

Permission setup:

1. Open Settings > Staff permissions.
2. Decide which permissions managers have.
3. Grant `Manage staff permissions` only to trusted managers.
4. Assign individual staff access for POS, bookings, inventory, payments, reports, memberships, and other modules.
5. Test with a staff login before launch.

Data ownership:

1. Open Settings > Data & Backup.
2. Review the ownership and shutdown policy.
3. Export business data when needed for backup, audit, migration, or offboarding.
4. Keep exported files secure because they may contain customer personal data.

Reviews:

1. Send review links after completed bookings or orders.
2. Review customer comments and ratings.
3. Hide inappropriate reviews from public display.
4. Track average rating, best staff, low-rated services, and trends.

AI assistant:

1. Open the AI assistant only if the package includes it.
2. Ask for sales summaries, inactive customers, best-selling services or products, staff performance, no-show patterns, campaign suggestions, and report explanations.
3. Treat AI output as operational guidance and verify before sending promotions or changing pricing.

Upgrade flow:

1. Open `/business/upgrade`.
2. Review current package, usage, locked modules, add-ons, and package comparison.
3. Use Contact Support or Upgrade Plan when a locked feature is needed.

## Manager

Managers can operate most business workflows depending on configured permissions:

- Bookings
- Customers and memberships
- POS
- Inventory
- Staff schedules
- Reports
- Notifications

Owner-only business settings should remain restricted.

If the owner grants `Manage staff permissions`, managers can assign module permissions to staff users. Managers cannot edit owner permissions, manager permissions, billing access, platform access, or permissions they are not allowed to grant.

## Staff

Staff users should use only daily operational areas:

- View assigned bookings.
- Check in or complete bookings.
- Process POS checkout if enabled.
- Record stock movement only if permitted.

Staff should not access owner settings, package billing, or platform admin pages.

Staff module access depends on both the business package and their individual permissions. For example, POS must be included in the business package, and the staff member must also be granted POS access.

## Customer

Customers use `/customer/:businessId`.

Customer portal tasks:

- Book appointments.
- View upcoming and past bookings.
- View memberships and remaining balance.
- View points and rewards.
- View payment history.
- Update profile details.

Customers should only see their own data.

## Booking Flow

1. Select service, staff, resource, branch, date, and time.
2. Search or create customer.
3. Add notes, deposit, and amount if needed.
4. Save booking.
5. Confirm, check in, progress, complete, cancel, or mark no-show.

Booking slot conflicts should be prevented by availability checks and validated operationally.

## Membership Flow

1. Create a membership plan.
2. Assign the plan to a customer.
3. Record usage for credit or visits.
4. Freeze, cancel, or renew as needed.
5. Review membership report.

Balances must not go below zero.

## POS Flow

1. Add products and stock quantities.
2. Open POS checkout.
3. Add products/services to cart.
4. Select customer if needed.
5. Record payment.
6. Complete order.
7. Confirm inventory deduction and receipt.

## Reports

Use date filters before exporting reports. Validate reports against payments, POS orders, bookings, and inventory records after major setup changes.

## Mobile Testing

Before launch, test on a small phone viewport and a tablet viewport:

- Login
- Sidebar and bottom mobile navigation
- Booking creation
- Check-in customer
- POS checkout
- Membership scan
- Owner sales summary
- Customer portal booking
- Reports filters
- Upgrade prompts
- Dark mode readability
