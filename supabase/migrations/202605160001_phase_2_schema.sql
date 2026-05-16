-- Luxantara Members - Phase 2 Supabase schema
-- Multi-tenant SaaS membership, booking, POS, inventory, and customer portal foundation.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null check (business_type in ('barber_shop', 'coffee_shop', 'salon', 'spa', 'clinic', 'event_space', 'custom')),
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  address text,
  timezone text not null default 'Asia/Kuala_Lumpur',
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  email text,
  is_main boolean not null default false,
  opening_hours jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('super_admin', 'owner', 'manager', 'staff', 'customer')),
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'invited', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_branch_business_required check (
    branch_id is null or business_id is not null
  )
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  yearly_price numeric(12,2) not null default 0 check (yearly_price >= 0),
  setup_fee numeric(12,2) not null default 0 check (setup_fee >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique check (module_key in (
    'core', 'booking', 'membership', 'loyalty', 'pos', 'inventory', 'staff_commission',
    'payment', 'notification', 'reports', 'marketing', 'multi_branch', 'customer_portal', 'white_label'
  )),
  module_name text not null,
  description text,
  category text not null,
  is_core boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_modules (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  access_level text not null check (access_level in ('none', 'basic', 'pro', 'advanced', 'unlimited')),
  limit_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (package_id, module_id)
);

create table public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  package_id uuid not null references public.packages(id),
  status text not null check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  start_date date not null,
  end_date date,
  trial_ends_at timestamptz,
  next_billing_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_module_access (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null references public.modules(module_key),
  access_level text not null check (access_level in ('none', 'basic', 'pro', 'advanced', 'unlimited')),
  is_enabled boolean not null default true,
  source text not null check (source in ('package', 'addon', 'trial', 'manual')),
  start_date date not null default current_date,
  end_date date,
  limit_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, module_key, source)
);

create table public.business_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null references public.modules(module_key),
  name text not null,
  access_level text not null default 'basic' check (access_level in ('none', 'basic', 'pro', 'advanced', 'unlimited')),
  price numeric(12,2) not null default 0 check (price >= 0),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  start_date date not null default current_date,
  end_date date,
  limit_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  module_key text not null references public.modules(module_key),
  usage_key text not null,
  used_count int not null default 0 check (used_count >= 0),
  limit_count int check (limit_count is null or limit_count >= 0),
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, module_key, usage_key, period_start, period_end),
  check (period_end >= period_start)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  birthday date,
  gender text,
  notes text,
  points_balance int not null default 0 check (points_balance >= 0),
  total_spent numeric(12,2) not null default 0 check (total_spent >= 0),
  visit_count int not null default 0 check (visit_count >= 0),
  no_show_count int not null default 0 check (no_show_count >= 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  role text not null default 'staff',
  commission_rate numeric(5,2) not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  working_hours jsonb not null default '{}'::jsonb,
  off_days jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  category text,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  is_bookable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookable_resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  resource_type text not null check (resource_type in ('barber_chair', 'table', 'room', 'event_space', 'custom')),
  capacity int not null default 1 check (capacity > 0),
  description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  resource_id uuid references public.bookable_resources(id) on delete set null,
  booking_type text not null check (booking_type in ('appointment', 'table', 'room', 'event', 'walk_in')),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes text,
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  plan_type text not null check (plan_type in ('subscription', 'prepaid_credit', 'visit_package', 'vip')),
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  duration_days int not null check (duration_days > 0),
  credit_amount numeric(12,2) not null default 0 check (credit_amount >= 0),
  visit_limit int check (visit_limit is null or visit_limit >= 0),
  points_bonus int not null default 0 check (points_bonus >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  benefits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id),
  status text not null check (status in ('active', 'expired', 'frozen', 'cancelled')),
  start_date date not null,
  end_date date not null,
  remaining_credit numeric(12,2) not null default 0 check (remaining_credit >= 0),
  remaining_visits int not null default 0 check (remaining_visits >= 0),
  auto_renew boolean not null default false,
  qr_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.membership_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  usage_type text not null check (usage_type in ('credit', 'visit', 'discount', 'manual_adjustment')),
  amount_used numeric(12,2) not null default 0 check (amount_used >= 0),
  visits_used int not null default 0 check (visits_used >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('earn', 'redeem', 'adjust', 'expire')),
  points int not null,
  description text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  reward_type text not null check (reward_type in ('voucher', 'discount', 'free_service', 'free_item', 'birthday', 'referral')),
  points_required int not null default 0 check (points_required >= 0),
  discount_amount numeric(12,2) check (discount_amount is null or discount_amount >= 0),
  discount_percent numeric(5,2) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  free_item text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  category text,
  sku text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 0 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('stock_in', 'stock_out', 'adjustment', 'transfer', 'sale')),
  quantity int not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.pos_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  order_number text not null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  order_status text not null default 'open' check (order_status in ('open', 'completed', 'voided', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, order_number)
);

create table public.pos_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.pos_orders(id) on delete cascade,
  item_type text not null check (item_type in ('product', 'service', 'membership')),
  item_id uuid,
  item_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  reference_type text not null check (reference_type in ('booking', 'pos_order', 'membership', 'invoice', 'manual')),
  reference_id uuid,
  payment_method text not null check (payment_method in ('cash', 'qr', 'card', 'bank_transfer', 'stripe', 'billplz', 'toyyibpay', 'senangpay', 'credit', 'points')),
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'paid', 'failed', 'refunded', 'cancelled')),
  proof_url text,
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'telegram', 'sms', 'in_app')),
  notification_type text not null,
  title text not null,
  message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  campaign_type text not null check (campaign_type in ('promo_code', 'discount', 'birthday', 'inactive_customer', 'referral', 'broadcast')),
  audience_filter jsonb not null default '{}'::jsonb,
  message text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid references public.business_subscriptions(id) on delete set null,
  invoice_number text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'overdue', 'void')),
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (invoice_number)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.user_business_id(user_id uuid default auth.uid())
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select business_id
  from public.user_profiles
  where id = user_id
    and status = 'active'
  limit 1
$$;

create or replace function public.user_role(user_id uuid default auth.uid())
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.user_profiles
  where id = user_id
    and status = 'active'
  limit 1
$$;

create or replace function public.is_super_admin(user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.user_role(user_id) = 'super_admin', false)
$$;

create or replace function public.has_business_access(target_business_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    public.is_super_admin(auth.uid())
    or exists (
      select 1
      from public.user_profiles up
      where up.id = auth.uid()
        and up.business_id = target_business_id
        and up.status = 'active'
    ),
    false
  )
$$;

create or replace function public.has_module_access(target_business_id uuid, target_module_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    public.is_super_admin(auth.uid())
    or exists (
      select 1
      from public.business_module_access bma
      where bma.business_id = target_business_id
        and bma.module_key = target_module_key
        and bma.is_enabled = true
        and bma.access_level <> 'none'
        and bma.start_date <= current_date
        and (bma.end_date is null or bma.end_date >= current_date)
    ),
    false
  )
$$;

create or replace function public.customer_owns_record(target_customer_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = target_customer_id
      and c.user_id = auth.uid()
      and c.status = 'active'
  )
$$;

create trigger set_businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger set_branches_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger set_user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger set_packages_updated_at before update on public.packages for each row execute function public.set_updated_at();
create trigger set_modules_updated_at before update on public.modules for each row execute function public.set_updated_at();
create trigger set_business_subscriptions_updated_at before update on public.business_subscriptions for each row execute function public.set_updated_at();
create trigger set_business_module_access_updated_at before update on public.business_module_access for each row execute function public.set_updated_at();
create trigger set_business_addons_updated_at before update on public.business_addons for each row execute function public.set_updated_at();
create trigger set_usage_counters_updated_at before update on public.usage_counters for each row execute function public.set_updated_at();
create trigger set_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger set_staff_updated_at before update on public.staff for each row execute function public.set_updated_at();
create trigger set_services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger set_bookable_resources_updated_at before update on public.bookable_resources for each row execute function public.set_updated_at();
create trigger set_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger set_membership_plans_updated_at before update on public.membership_plans for each row execute function public.set_updated_at();
create trigger set_memberships_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger set_rewards_updated_at before update on public.rewards for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger set_pos_orders_updated_at before update on public.pos_orders for each row execute function public.set_updated_at();
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger set_marketing_campaigns_updated_at before update on public.marketing_campaigns for each row execute function public.set_updated_at();

create index businesses_status_idx on public.businesses(status);
create index branches_business_id_idx on public.branches(business_id);
create index branches_status_idx on public.branches(status);
create index user_profiles_business_id_idx on public.user_profiles(business_id);
create index user_profiles_branch_id_idx on public.user_profiles(branch_id);
create index user_profiles_role_idx on public.user_profiles(role);
create index package_modules_package_id_idx on public.package_modules(package_id);
create index package_modules_module_id_idx on public.package_modules(module_id);
create index business_subscriptions_business_id_idx on public.business_subscriptions(business_id);
create index business_subscriptions_package_id_idx on public.business_subscriptions(package_id);
create index business_subscriptions_status_idx on public.business_subscriptions(status);
create index business_module_access_business_id_idx on public.business_module_access(business_id);
create index business_module_access_module_key_idx on public.business_module_access(module_key);
create index business_addons_business_id_idx on public.business_addons(business_id);
create index business_addons_module_key_idx on public.business_addons(module_key);
create index usage_counters_business_id_idx on public.usage_counters(business_id);
create index usage_counters_module_key_idx on public.usage_counters(module_key);
create index customers_business_id_idx on public.customers(business_id);
create index customers_branch_id_idx on public.customers(branch_id);
create index customers_user_id_idx on public.customers(user_id);
create index customers_email_idx on public.customers(email) where email is not null;
create index staff_business_id_idx on public.staff(business_id);
create index staff_branch_id_idx on public.staff(branch_id);
create index staff_user_id_idx on public.staff(user_id);
create index services_business_id_idx on public.services(business_id);
create index services_branch_id_idx on public.services(branch_id);
create index bookable_resources_business_id_idx on public.bookable_resources(business_id);
create index bookable_resources_branch_id_idx on public.bookable_resources(branch_id);
create index bookings_business_id_idx on public.bookings(business_id);
create index bookings_branch_id_idx on public.bookings(branch_id);
create index bookings_customer_id_idx on public.bookings(customer_id);
create index bookings_staff_id_idx on public.bookings(staff_id);
create index bookings_service_id_idx on public.bookings(service_id);
create index bookings_resource_id_idx on public.bookings(resource_id);
create index bookings_schedule_idx on public.bookings(business_id, branch_id, booking_date, start_time);
create index membership_plans_business_id_idx on public.membership_plans(business_id);
create index memberships_business_id_idx on public.memberships(business_id);
create index memberships_customer_id_idx on public.memberships(customer_id);
create index memberships_plan_id_idx on public.memberships(plan_id);
create index membership_usage_business_id_idx on public.membership_usage(business_id);
create index membership_usage_membership_id_idx on public.membership_usage(membership_id);
create index membership_usage_customer_id_idx on public.membership_usage(customer_id);
create index membership_usage_booking_id_idx on public.membership_usage(booking_id);
create index loyalty_transactions_business_id_idx on public.loyalty_transactions(business_id);
create index loyalty_transactions_customer_id_idx on public.loyalty_transactions(customer_id);
create index rewards_business_id_idx on public.rewards(business_id);
create index products_business_id_idx on public.products(business_id);
create index products_branch_id_idx on public.products(branch_id);
create index products_low_stock_idx on public.products(business_id, branch_id) where is_active = true and stock_quantity <= low_stock_threshold;
create index inventory_transactions_business_id_idx on public.inventory_transactions(business_id);
create index inventory_transactions_branch_id_idx on public.inventory_transactions(branch_id);
create index inventory_transactions_product_id_idx on public.inventory_transactions(product_id);
create index pos_orders_business_id_idx on public.pos_orders(business_id);
create index pos_orders_branch_id_idx on public.pos_orders(branch_id);
create index pos_orders_customer_id_idx on public.pos_orders(customer_id);
create index pos_orders_staff_id_idx on public.pos_orders(staff_id);
create index pos_order_items_order_id_idx on public.pos_order_items(order_id);
create index payments_business_id_idx on public.payments(business_id);
create index payments_customer_id_idx on public.payments(customer_id);
create index payments_reference_idx on public.payments(reference_type, reference_id);
create index notifications_business_id_idx on public.notifications(business_id);
create index notifications_customer_id_idx on public.notifications(customer_id);
create index marketing_campaigns_business_id_idx on public.marketing_campaigns(business_id);
create index billing_invoices_business_id_idx on public.billing_invoices(business_id);
create index billing_invoices_subscription_id_idx on public.billing_invoices(subscription_id);
create index audit_logs_business_id_idx on public.audit_logs(business_id);
create index audit_logs_user_id_idx on public.audit_logs(user_id);
create index audit_logs_table_record_idx on public.audit_logs(table_name, record_id);

alter table public.businesses enable row level security;
alter table public.branches enable row level security;
alter table public.user_profiles enable row level security;
alter table public.packages enable row level security;
alter table public.modules enable row level security;
alter table public.package_modules enable row level security;
alter table public.business_subscriptions enable row level security;
alter table public.business_module_access enable row level security;
alter table public.business_addons enable row level security;
alter table public.usage_counters enable row level security;
alter table public.customers enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.bookable_resources enable row level security;
alter table public.bookings enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.membership_usage enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.products enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.pos_orders enable row level security;
alter table public.pos_order_items enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.audit_logs enable row level security;

create policy "packages are readable" on public.packages for select to anon, authenticated using (is_active = true or public.is_super_admin(auth.uid()));
create policy "modules are readable" on public.modules for select to anon, authenticated using (is_active = true or public.is_super_admin(auth.uid()));
create policy "package modules are readable" on public.package_modules for select to anon, authenticated using (is_enabled = true or public.is_super_admin(auth.uid()));
create policy "super admins manage packages" on public.packages for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super admins manage modules" on public.modules for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "super admins manage package modules" on public.package_modules for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

create policy "profiles read own tenant" on public.user_profiles for select to authenticated using (
  id = auth.uid() or public.is_super_admin(auth.uid()) or public.has_business_access(business_id)
);
create policy "profiles update own profile" on public.user_profiles for update to authenticated using (
  id = auth.uid() or public.is_super_admin(auth.uid()) or (
    public.has_business_access(business_id) and public.user_role(auth.uid()) in ('owner', 'manager')
  )
) with check (
  id = auth.uid() or public.is_super_admin(auth.uid()) or (
    public.has_business_access(business_id) and public.user_role(auth.uid()) in ('owner', 'manager')
  )
);
create policy "profiles insert by managers" on public.user_profiles for insert to authenticated with check (
  public.is_super_admin(auth.uid()) or (
    public.has_business_access(business_id) and public.user_role(auth.uid()) in ('owner', 'manager')
  )
);

create policy "business tenant select" on public.businesses for select to authenticated using (public.has_business_access(id));
create policy "business tenant update" on public.businesses for update to authenticated using (
  public.is_super_admin(auth.uid()) or (public.has_business_access(id) and public.user_role(auth.uid()) = 'owner')
) with check (
  public.is_super_admin(auth.uid()) or (public.has_business_access(id) and public.user_role(auth.uid()) = 'owner')
);
create policy "business insert owner or super admin" on public.businesses for insert to authenticated with check (true);

create policy "branches tenant all" on public.branches for all to authenticated using (public.has_business_access(business_id)) with check (public.has_business_access(business_id));
create policy "subscriptions tenant read" on public.business_subscriptions for select to authenticated using (public.has_business_access(business_id));
create policy "subscriptions super admin write" on public.business_subscriptions for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "module access tenant read" on public.business_module_access for select to authenticated using (public.has_business_access(business_id));
create policy "module access super admin write" on public.business_module_access for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "addons tenant read" on public.business_addons for select to authenticated using (public.has_business_access(business_id));
create policy "addons super admin write" on public.business_addons for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "usage tenant read" on public.usage_counters for select to authenticated using (public.has_business_access(business_id));
create policy "usage tenant write managers" on public.usage_counters for all to authenticated using (
  public.has_business_access(business_id) and public.user_role(auth.uid()) in ('super_admin', 'owner', 'manager')
) with check (
  public.has_business_access(business_id) and public.user_role(auth.uid()) in ('super_admin', 'owner', 'manager')
);

create policy "customers tenant or self read" on public.customers for select to authenticated using (
  public.has_business_access(business_id) or user_id = auth.uid()
);
create policy "customers tenant write" on public.customers for all to authenticated using (
  public.has_business_access(business_id)
) with check (
  public.has_business_access(business_id) or user_id = auth.uid()
);

create policy "staff tenant all" on public.staff for all to authenticated using (public.has_business_access(business_id)) with check (public.has_business_access(business_id));
create policy "services booking module all" on public.services for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'booking')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'booking')
);
create policy "resources booking module all" on public.bookable_resources for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'booking')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'booking')
);

create policy "bookings tenant or customer read" on public.bookings for select to authenticated using (
  public.has_module_access(business_id, 'booking') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "bookings tenant or customer insert" on public.bookings for insert to authenticated with check (
  public.has_module_access(business_id, 'booking') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "bookings tenant or customer update" on public.bookings for update to authenticated using (
  public.has_module_access(business_id, 'booking') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
) with check (
  public.has_module_access(business_id, 'booking') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "bookings tenant delete" on public.bookings for delete to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'booking')
);

create policy "membership plans module all" on public.membership_plans for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'membership')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'membership')
);
create policy "memberships tenant or customer read" on public.memberships for select to authenticated using (
  public.has_module_access(business_id, 'membership') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "memberships tenant write" on public.memberships for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'membership')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'membership')
);
create policy "membership usage tenant or customer read" on public.membership_usage for select to authenticated using (
  public.has_module_access(business_id, 'membership') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "membership usage tenant write" on public.membership_usage for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'membership')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'membership')
);

create policy "loyalty tenant or customer read" on public.loyalty_transactions for select to authenticated using (
  public.has_module_access(business_id, 'loyalty') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "loyalty tenant write" on public.loyalty_transactions for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
);
create policy "rewards module all" on public.rewards for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
);

create policy "products inventory module all" on public.products for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'inventory')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'inventory')
);
create policy "inventory module all" on public.inventory_transactions for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'inventory')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'inventory')
);
create policy "pos orders tenant or customer read" on public.pos_orders for select to authenticated using (
  public.has_module_access(business_id, 'pos') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "pos orders tenant write" on public.pos_orders for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'pos')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'pos')
);
create policy "pos items tenant read" on public.pos_order_items for select to authenticated using (
  exists (
    select 1 from public.pos_orders po
    where po.id = order_id
      and public.has_module_access(po.business_id, 'pos')
      and (public.has_business_access(po.business_id) or public.customer_owns_record(po.customer_id))
  )
);
create policy "pos items tenant write" on public.pos_order_items for all to authenticated using (
  exists (
    select 1 from public.pos_orders po
    where po.id = order_id
      and public.has_business_access(po.business_id)
      and public.has_module_access(po.business_id, 'pos')
  )
) with check (
  exists (
    select 1 from public.pos_orders po
    where po.id = order_id
      and public.has_business_access(po.business_id)
      and public.has_module_access(po.business_id, 'pos')
  )
);

create policy "payments tenant or customer read" on public.payments for select to authenticated using (
  public.has_module_access(business_id, 'payment') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "payments tenant write" on public.payments for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
);
create policy "notifications tenant or customer read" on public.notifications for select to authenticated using (
  public.has_module_access(business_id, 'notification') and (
    public.has_business_access(business_id) or public.customer_owns_record(customer_id)
  )
);
create policy "notifications tenant write" on public.notifications for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'notification')
);
create policy "campaigns marketing module all" on public.marketing_campaigns for all to authenticated using (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
) with check (
  public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
);
create policy "billing invoices tenant read" on public.billing_invoices for select to authenticated using (
  public.has_business_access(business_id) or public.is_super_admin(auth.uid())
);
create policy "billing invoices super admin write" on public.billing_invoices for all to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
create policy "audit logs tenant read" on public.audit_logs for select to authenticated using (
  public.has_business_access(business_id) or public.is_super_admin(auth.uid())
);
create policy "audit logs insert" on public.audit_logs for insert to authenticated with check (
  public.has_business_access(business_id) or public.is_super_admin(auth.uid())
);
