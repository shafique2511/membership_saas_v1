-- Luxantara Members - Phase 16: Marketing Module

-- 1. Promo codes
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed', 'free_item')),
  discount_value numeric(12,2) not null,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  min_purchase numeric(12,2) default 0,
  applies_to text default 'all' check (applies_to in ('all', 'service', 'product', 'membership')),
  applicable_ids jsonb default '[]'::jsonb,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

-- 2. Customer segments
create table if not exists public.customer_segments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  segment_type text not null check (segment_type in (
    'new_customers', 'active_members', 'expiring_members', 'vip_customers',
    'inactive_customers', 'birthday_month', 'high_spenders', 'no_show_customers', 'by_service'
  )),
  criteria jsonb not null default '{}'::jsonb,
  customer_count integer not null default 0,
  last_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

-- 3. Campaign results
create table if not exists public.campaign_results (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  total_reached integer not null default 0,
  total_opened integer not null default 0,
  total_clicked integer not null default 0,
  total_converted integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, campaign_id)
);

-- 4. Enhance marketing_campaigns
alter table public.marketing_campaigns add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null;
alter table public.marketing_campaigns add column if not exists segment_id uuid references public.customer_segments(id) on delete set null;
alter table public.marketing_campaigns add column if not exists channel text default 'in_app';
alter table public.marketing_campaigns add column if not exists subject text;

-- 5. Indexes
create index if not exists promo_codes_business_id_idx on public.promo_codes(business_id);
create index if not exists promo_codes_code_idx on public.promo_codes(code);
create index if not exists promo_codes_active_idx on public.promo_codes(is_active);
create index if not exists customer_segments_business_id_idx on public.customer_segments(business_id);
create index if not exists customer_segments_type_idx on public.customer_segments(segment_type);
create index if not exists campaign_results_campaign_id_idx on public.campaign_results(campaign_id);

-- 6. RLS
alter table public.promo_codes enable row level security;
alter table public.customer_segments enable row level security;
alter table public.campaign_results enable row level security;

create policy "promo codes tenant all" on public.promo_codes
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
  );

create policy "customer segments tenant all" on public.customer_segments
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
  );

create policy "campaign results tenant all" on public.campaign_results
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'marketing')
  );

-- 7. RPC: calculate_segment_count
create or replace function public.calculate_segment_count(
  p_business_id uuid,
  p_segment_type text,
  p_criteria jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  case p_segment_type
    when 'new_customers' then
      select count(*) into v_count from public.customers
      where business_id = p_business_id
        and created_at >= now() - interval '30 days';
    when 'active_members' then
      select count(*) into v_count from public.memberships
      where business_id = p_business_id and status = 'active';
    when 'expiring_members' then
      select count(*) into v_count from public.memberships
      where business_id = p_business_id
        and status = 'active'
        and expiry_date between now() and now() + interval '30 days';
    when 'birthday_month' then
      select count(*) into v_count from public.customers
      where business_id = p_business_id
        and extract(month from birth_date) = extract(month from current_date);
    when 'inactive_customers' then
      select count(*) into v_count from public.customers c
      where c.business_id = p_business_id
        and not exists (
          select 1 from public.bookings b
          where b.customer_id = c.id and b.created_at >= now() - interval '90 days'
        );
    when 'no_show_customers' then
      select count(*) into v_count from public.customers c
      where c.business_id = p_business_id
        and exists (
          select 1 from public.bookings b
          where b.customer_id = c.id and b.status = 'no_show' and b.created_at >= now() - interval '90 days'
        );
    else
      select count(*) into v_count from public.customers
      where business_id = p_business_id;
  end case;

  return v_count;
end;
$$;

grant execute on function public.calculate_segment_count(uuid, text, jsonb) to authenticated;
