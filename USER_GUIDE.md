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
- Sidebar/mobile navigation
- Booking creation
- POS checkout
- Customer portal booking
- Reports filters
- Dark mode readability
