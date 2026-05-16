-- Luxantara Members - Phase 9: Loyalty & Rewards Module

-- 1. Loyalty settings per business
create table if not exists public.loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade unique,
  earning_rate numeric(10,2) not null default 1.0 check (earning_rate > 0),
  redemption_rate int not null default 100 check (redemption_rate > 0),
  redemption_discount_amount numeric(12,2) not null default 5.0 check (redemption_discount_amount >= 0),
  birthday_reward_points int not null default 100 check (birthday_reward_points >= 0),
  referral_reward_points int not null default 200 check (referral_reward_points >= 0),
  points_expiry_days int not null default 365 check (points_expiry_days > 0),
  min_redemption_points int not null default 100 check (min_redemption_points > 0),
  auto_award_birthday boolean not null default true,
  auto_award_referral boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enhance rewards catalog with missing columns
alter table public.rewards add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.rewards add column if not exists item_name text;
alter table public.rewards add column if not exists voucher_code text;
alter table public.rewards add column if not exists usage_limit int;
alter table public.rewards add column if not exists times_redeemed int not null default 0 check (times_redeemed >= 0);
alter table public.rewards add column if not exists image_url text;

-- 3. Enhance loyalty_transactions with reference metadata
alter table public.loyalty_transactions add column if not exists reference_type text check (reference_type in ('payment', 'booking', 'reward', 'manual', 'birthday', 'referral', 'campaign'));
alter table public.loyalty_transactions add column if not exists reference_id uuid;
alter table public.loyalty_transactions add column if not exists reward_id uuid references public.rewards(id) on delete set null;
alter table public.loyalty_transactions add column if not exists balance_after int;
alter table public.loyalty_transactions add column if not exists created_by uuid references auth.users(id) on delete set null;

-- 4. Referral rewards
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  referrer_customer_id uuid not null references public.customers(id) on delete cascade,
  referred_customer_id uuid not null references public.customers(id) on delete cascade,
  referred_name text not null,
  points_awarded int not null default 200 check (points_awarded >= 0),
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'expired')),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, referred_customer_id)
);

-- 5. Birthday rewards
create table if not exists public.birthday_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reward_year int not null,
  points_awarded int not null default 100 check (points_awarded >= 0),
  status text not null default 'pending' check (status in ('pending', 'awarded', 'expired')),
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, customer_id, reward_year)
);

-- 6. RPC: award loyalty points
create or replace function public.award_loyalty_points(
  p_business_id uuid,
  p_customer_id uuid,
  p_points int,
  p_reference_type text,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance int;
begin
  update public.customers
  set points_balance = points_balance + p_points
  where id = p_customer_id and business_id = p_business_id
  returning points_balance into v_current_balance;

  insert into public.loyalty_transactions (business_id, customer_id, transaction_type, points, description, reference_type, reference_id, balance_after)
  values (p_business_id, p_customer_id, 'earn', p_points, p_points || ' points earned', p_reference_type, p_reference_id, v_current_balance);
end;
$$;

-- 7. RPC: redeem loyalty points
create or replace function public.redeem_loyalty_points(
  p_business_id uuid,
  p_customer_id uuid,
  p_points int,
  p_reward_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance int;
begin
  select points_balance into v_current_balance
  from public.customers
  where id = p_customer_id and business_id = p_business_id;

  if v_current_balance < p_points then
    raise exception 'Insufficient points' using errcode = 'P0002';
  end if;

  update public.customers
  set points_balance = points_balance - p_points
  where id = p_customer_id and business_id = p_business_id
  returning points_balance into v_current_balance;

  insert into public.loyalty_transactions (business_id, customer_id, transaction_type, points, description, reference_type, reward_id, balance_after)
  values (p_business_id, p_customer_id, 'redeem', -p_points, p_points || ' points redeemed', 'reward', p_reward_id, v_current_balance);
end;
$$;

-- 8. RPC: adjust loyalty points
create or replace function public.adjust_loyalty_points(
  p_business_id uuid,
  p_customer_id uuid,
  p_points int,
  p_description text,
  p_created_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance int;
begin
  update public.customers
  set points_balance = greatest(0, points_balance + p_points)
  where id = p_customer_id and business_id = p_business_id
  returning points_balance into v_current_balance;

  insert into public.loyalty_transactions (business_id, customer_id, transaction_type, points, description, reference_type, created_by, balance_after)
  values (p_business_id, p_customer_id, 'adjust', p_points, p_description, 'manual', p_created_by, v_current_balance);
end;
$$;

-- 9. RPC: award birthday reward
create or replace function public.award_birthday_reward(
  p_business_id uuid,
  p_customer_id uuid,
  p_year int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_points int;
begin
  select birthday_reward_points into v_points
  from public.loyalty_settings
  where business_id = p_business_id;

  if v_points is null then
    v_points := 100;
  end if;

  perform public.award_loyalty_points(p_business_id, p_customer_id, v_points, 'birthday');

  insert into public.birthday_rewards (business_id, customer_id, reward_year, points_awarded, status, awarded_at)
  values (p_business_id, p_customer_id, p_year, v_points, 'awarded', now())
  on conflict (business_id, customer_id, reward_year) do update
  set status = 'awarded', awarded_at = now();
end;
$$;

grant execute on function public.award_loyalty_points(uuid, uuid, int, text, uuid) to authenticated;
grant execute on function public.redeem_loyalty_points(uuid, uuid, int, uuid) to authenticated;
grant execute on function public.adjust_loyalty_points(uuid, uuid, int, text, uuid) to authenticated;
grant execute on function public.award_birthday_reward(uuid, uuid, int) to authenticated;

-- 10. RLS for new tables
alter table public.loyalty_settings enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.birthday_rewards enable row level security;

create policy "loyalty settings tenant all" on public.loyalty_settings
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy "referral rewards tenant or customer read" on public.referral_rewards
  for select to authenticated using (
    public.has_module_access(business_id, 'loyalty') and (
      public.has_business_access(business_id) or public.customer_owns_record(referrer_customer_id)
    )
  );

create policy "referral rewards tenant write" on public.referral_rewards
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
  );

create policy "birthday rewards tenant or customer read" on public.birthday_rewards
  for select to authenticated using (
    public.has_module_access(business_id, 'loyalty') and (
      public.has_business_access(business_id) or public.customer_owns_record(customer_id)
    )
  );

create policy "birthday rewards tenant write" on public.birthday_rewards
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'loyalty')
  );

-- 11. Indexes
create index if not exists loyalty_settings_business_id_idx on public.loyalty_settings(business_id);
create index if not exists referral_rewards_business_id_idx on public.referral_rewards(business_id);
create index if not exists referral_rewards_referrer_idx on public.referral_rewards(referrer_customer_id);
create index if not exists referral_rewards_referred_idx on public.referral_rewards(referred_customer_id);
create index if not exists birthday_rewards_business_id_idx on public.birthday_rewards(business_id);
create index if not exists birthday_rewards_customer_id_idx on public.birthday_rewards(customer_id);
create index if not exists birthday_rewards_year_idx on public.birthday_rewards(reward_year);

-- 12. Triggers
create trigger if not exists set_loyalty_settings_updated_at before update on public.loyalty_settings
  for each row execute function public.set_updated_at();
create trigger if not exists set_referral_rewards_updated_at before update on public.referral_rewards
  for each row execute function public.set_updated_at();
create trigger if not exists set_birthday_rewards_updated_at before update on public.birthday_rewards
  for each row execute function public.set_updated_at();
