-- Luxantara Members - Phase 2 package and module seed data

insert into public.packages (name, slug, description, monthly_price, yearly_price, setup_fee, sort_order)
values
  ('Starter', 'starter', 'Core booking package for small service businesses.', 99, 990, 0, 10),
  ('Growth', 'growth', 'Membership and loyalty foundation for growing teams.', 199, 1990, 0, 20),
  ('Pro', 'pro', 'Operations suite with POS, inventory, staff, payments, and notifications.', 399, 3990, 0, 30),
  ('Business Suite', 'business_suite', 'Advanced business suite for larger teams and multi-module operations.', 699, 6990, 0, 40),
  ('Enterprise', 'enterprise', 'Full platform access with white label, advanced branches, and custom limits.', 0, 0, 0, 50)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  setup_fee = excluded.setup_fee,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.modules (module_key, module_name, description, category, is_core, sort_order)
values
  ('core', 'Core Business System', 'Business profile, customers, settings, base dashboard, and tenant controls.', 'platform', true, 10),
  ('data_ownership_backup', 'Data Ownership & Backup', 'Business data ownership policies, export tools, backup logs, migration support, and shutdown procedures.', 'governance', true, 15),
  ('booking', 'Booking Module', 'Appointments, tables, rooms, events, walk-ins, statuses, deposits, and public booking.', 'operations', false, 20),
  ('membership', 'Membership Module', 'Membership plans, credits, visit packages, renewals, expiry, and member benefits.', 'membership', false, 30),
  ('loyalty', 'Loyalty & Rewards Module', 'Points, redemption, vouchers, birthday rewards, referrals, and reward history.', 'membership', false, 40),
  ('pos', 'POS Module', 'Checkout for products, services, memberships, discounts, payments, receipts, and refunds.', 'sales', false, 50),
  ('inventory', 'Inventory Module', 'Products, stock movement, low-stock alerts, suppliers, branch inventory, and transfers.', 'operations', false, 60),
  ('staff_commission', 'Staff & Commission Module', 'Staff profiles, schedules, assigned services, performance, and commissions.', 'team', false, 70),
  ('payment', 'Payment Module', 'Payment tracking, proofs, verification, invoices, deposits, refunds, and gateway-ready records.', 'finance', false, 80),
  ('notification', 'Notification Module', 'Email, WhatsApp, Telegram, reminders, templates, broadcasts, and logs.', 'communication', false, 90),
  ('reports', 'Reports Module', 'Sales, bookings, members, customers, loyalty, staff, inventory, payment, and profit reports.', 'analytics', false, 100),
  ('marketing', 'Marketing Module', 'Promo codes, campaigns, customer segments, referrals, and broadcast reporting.', 'growth', false, 110),
  ('multi_branch', 'Multi-Branch Module', 'Branch dashboards, branch staff, branch bookings, stock transfer, and comparisons.', 'operations', false, 120),
  ('customer_portal', 'Customer Portal Module', 'Mobile-first public page, login, booking, membership, rewards, profile, and history.', 'customer', false, 130),
  ('white_label', 'White Label Module', 'Custom logo, brand color, domain-ready structure, and reseller-ready branding.', 'enterprise', false, 140)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  description = excluded.description,
  category = excluded.category,
  is_core = excluded.is_core,
  sort_order = excluded.sort_order,
  updated_at = now();

with package_rules(package_slug, module_key, access_level, limit_config, is_enabled) as (
  values
    ('starter', 'core', 'basic', '{"branches":1,"staff":3,"customers":500}'::jsonb, true),
    ('starter', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
    ('starter', 'booking', 'basic', '{"bookings_per_month":300,"resources":3}'::jsonb, true),
    ('starter', 'customer_portal', 'basic', '{"public_pages":1}'::jsonb, true),
    ('starter', 'reports', 'basic', '{"export":false,"retention_months":3}'::jsonb, true),

    ('growth', 'core', 'basic', '{"branches":1,"staff":8,"customers":2000}'::jsonb, true),
    ('growth', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
    ('growth', 'booking', 'basic', '{"bookings_per_month":1000,"resources":10}'::jsonb, true),
    ('growth', 'membership', 'basic', '{"plans":5,"active_members":1000}'::jsonb, true),
    ('growth', 'loyalty', 'basic', '{"rewards":10}'::jsonb, true),
    ('growth', 'payment', 'basic', '{"manual_verification":true}'::jsonb, true),
    ('growth', 'customer_portal', 'basic', '{"public_pages":1}'::jsonb, true),
    ('growth', 'reports', 'basic', '{"export":false,"retention_months":6}'::jsonb, true),

    ('pro', 'core', 'pro', '{"branches":1,"staff":25,"customers":10000}'::jsonb, true),
    ('pro', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
    ('pro', 'booking', 'pro', '{"bookings_per_month":5000,"resources":30}'::jsonb, true),
    ('pro', 'membership', 'pro', '{"plans":25,"active_members":5000}'::jsonb, true),
    ('pro', 'loyalty', 'pro', '{"rewards":50}'::jsonb, true),
    ('pro', 'pos', 'basic', '{"registers":2}'::jsonb, true),
    ('pro', 'inventory', 'basic', '{"products":1000}'::jsonb, true),
    ('pro', 'staff_commission', 'basic', '{"commission_rules":10}'::jsonb, true),
    ('pro', 'payment', 'pro', '{"manual_verification":true,"gateway_ready":true}'::jsonb, true),
    ('pro', 'notification', 'basic', '{"templates":20,"monthly_sends":3000}'::jsonb, true),
    ('pro', 'reports', 'pro', '{"export":true,"retention_months":12}'::jsonb, true),
    ('pro', 'customer_portal', 'pro', '{"public_pages":1,"member_login":true}'::jsonb, true),

    ('business_suite', 'core', 'advanced', '{"branches":3,"staff":100,"customers":50000}'::jsonb, true),
    ('business_suite', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
    ('business_suite', 'booking', 'advanced', '{"bookings_per_month":20000,"resources":100,"approval_rules":true}'::jsonb, true),
    ('business_suite', 'membership', 'advanced', '{"plans":100,"active_members":25000,"freezing":true}'::jsonb, true),
    ('business_suite', 'loyalty', 'advanced', '{"rewards":200,"referrals":true}'::jsonb, true),
    ('business_suite', 'pos', 'pro', '{"registers":10,"split_payment":true,"daily_closing":true}'::jsonb, true),
    ('business_suite', 'inventory', 'pro', '{"products":10000,"transfers":true,"suppliers":true}'::jsonb, true),
    ('business_suite', 'staff_commission', 'pro', '{"commission_rules":100,"approval_flow":true}'::jsonb, true),
    ('business_suite', 'payment', 'pro', '{"manual_verification":true,"gateway_ready":true,"partial_payments":true}'::jsonb, true),
    ('business_suite', 'notification', 'pro', '{"templates":100,"monthly_sends":25000}'::jsonb, true),
    ('business_suite', 'reports', 'advanced', '{"export":true,"pdf":true,"retention_months":24}'::jsonb, true),
    ('business_suite', 'marketing', 'basic', '{"campaigns_per_month":25,"segments":20}'::jsonb, true),
    ('business_suite', 'multi_branch', 'basic', '{"branches":3}'::jsonb, true),
    ('business_suite', 'customer_portal', 'advanced', '{"public_pages":3,"member_login":true,"custom_branding":true}'::jsonb, true),

    ('enterprise', 'core', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'data_ownership_backup', 'unlimited', '{}'::jsonb, true),
    ('enterprise', 'booking', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'membership', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'loyalty', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'pos', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'inventory', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'staff_commission', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'payment', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'notification', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'reports', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'marketing', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'multi_branch', 'advanced', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'customer_portal', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'white_label', 'unlimited', '{"custom_domain_ready":true,"hide_platform_branding":true}'::jsonb, true)
)
insert into public.package_modules (package_id, module_id, access_level, limit_config, is_enabled)
select p.id, m.id, pr.access_level, pr.limit_config, pr.is_enabled
from package_rules pr
join public.packages p on p.slug = pr.package_slug
join public.modules m on m.module_key = pr.module_key
on conflict (package_id, module_id) do update set
  access_level = excluded.access_level,
  limit_config = excluded.limit_config,
  is_enabled = excluded.is_enabled;
