-- Luxantara Members - Phase 4 exact package access and usage limit rules

with package_rules(package_slug, module_key, access_level, limit_config, is_enabled) as (
  values
    ('starter', 'core', 'unlimited', '{"customers":300,"staff":2,"branches":1}'::jsonb, true),
    ('starter', 'booking', 'basic', '{"bookings_per_month":100}'::jsonb, true),
    ('starter', 'customer_portal', 'basic', '{}'::jsonb, true),
    ('starter', 'reports', 'basic', '{}'::jsonb, true),

    ('growth', 'core', 'unlimited', '{"customers":1000,"staff":5,"branches":1}'::jsonb, true),
    ('growth', 'booking', 'pro', '{"bookings_per_month":300}'::jsonb, true),
    ('growth', 'membership', 'basic', '{}'::jsonb, true),
    ('growth', 'loyalty', 'basic', '{}'::jsonb, true),
    ('growth', 'payment', 'basic', '{}'::jsonb, true),
    ('growth', 'customer_portal', 'pro', '{}'::jsonb, true),
    ('growth', 'reports', 'basic', '{}'::jsonb, true),

    ('pro', 'core', 'unlimited', '{"customers":5000,"staff":15,"branches":2}'::jsonb, true),
    ('pro', 'booking', 'pro', '{"bookings_per_month":1000}'::jsonb, true),
    ('pro', 'membership', 'pro', '{}'::jsonb, true),
    ('pro', 'loyalty', 'pro', '{}'::jsonb, true),
    ('pro', 'pos', 'basic', '{}'::jsonb, true),
    ('pro', 'inventory', 'basic', '{}'::jsonb, true),
    ('pro', 'staff_commission', 'basic', '{}'::jsonb, true),
    ('pro', 'payment', 'pro', '{}'::jsonb, true),
    ('pro', 'notification', 'basic', '{"whatsapp_messages_per_month":500}'::jsonb, true),
    ('pro', 'customer_portal', 'pro', '{}'::jsonb, true),
    ('pro', 'reports', 'pro', '{}'::jsonb, true),

    ('business_suite', 'core', 'unlimited', '{"customers":20000,"staff":50,"branches":5}'::jsonb, true),
    ('business_suite', 'booking', 'advanced', '{"bookings_per_month":5000}'::jsonb, true),
    ('business_suite', 'membership', 'advanced', '{}'::jsonb, true),
    ('business_suite', 'loyalty', 'advanced', '{}'::jsonb, true),
    ('business_suite', 'pos', 'pro', '{}'::jsonb, true),
    ('business_suite', 'inventory', 'pro', '{}'::jsonb, true),
    ('business_suite', 'staff_commission', 'pro', '{}'::jsonb, true),
    ('business_suite', 'payment', 'pro', '{}'::jsonb, true),
    ('business_suite', 'notification', 'pro', '{"whatsapp_messages_per_month":2000}'::jsonb, true),
    ('business_suite', 'customer_portal', 'advanced', '{}'::jsonb, true),
    ('business_suite', 'reports', 'advanced', '{}'::jsonb, true),
    ('business_suite', 'marketing', 'pro', '{}'::jsonb, true),
    ('business_suite', 'multi_branch', 'basic', '{}'::jsonb, true),

    ('enterprise', 'core', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'booking', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'membership', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'loyalty', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'pos', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'inventory', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'staff_commission', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'payment', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'notification', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'customer_portal', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'reports', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'marketing', 'unlimited', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'multi_branch', 'advanced', '{"custom_limits":true}'::jsonb, true),
    ('enterprise', 'white_label', 'unlimited', '{"custom_limits":true,"priority_support":true}'::jsonb, true)
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

update public.business_module_access bma
set
  access_level = pm.access_level,
  limit_config = pm.limit_config,
  is_enabled = pm.is_enabled,
  updated_at = now()
from public.business_subscriptions bs
join public.package_modules pm on pm.package_id = bs.package_id
join public.modules m on m.id = pm.module_id
where bma.business_id = bs.business_id
  and bma.module_key = m.module_key
  and bma.source = 'package'
  and bs.status in ('trial', 'active', 'past_due');
