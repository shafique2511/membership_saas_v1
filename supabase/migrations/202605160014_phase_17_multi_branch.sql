-- Luxantara Members - Phase 17: Multi-Branch Module
-- Branch staff assignments, branch-scoped RPCs, and branch limit tracking.

create table if not exists public.branch_staff (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (branch_id, staff_id)
);

create index branch_staff_branch_id_idx on public.branch_staff(branch_id);
create index branch_staff_staff_id_idx on public.branch_staff(staff_id);

alter table public.branch_staff enable row level security;
create policy "branch_staff tenant all" on public.branch_staff for all to authenticated
  using (public.has_business_access(public.user_business_id()))
  with check (public.has_business_access(public.user_business_id()));

create or replace function public.get_branch_limit_count(p_business_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select (limit_config->>'branch_limit')::int
     from public.business_module_access bma
     where bma.business_id = p_business_id
       and bma.module_key = 'multi_branch'
       and bma.is_enabled = true
       and bma.access_level <> 'none'
       and bma.start_date <= current_date
       and (bma.end_date is null or bma.end_date >= current_date)
     limit 1),
    (select case
       when p.name = 'starter' then 1
       when p.name = 'growth' then 3
       when p.name = 'pro' then 5
       when p.name = 'business_suite' then 10
       when p.name = 'enterprise' then 99
       else 1
     end
     from public.businesses b
     join public.business_subscriptions bs on bs.business_id = b.id and bs.status in ('trial', 'active')
     join public.packages p on p.id = bs.package_id
     where b.id = p_business_id
     limit 1),
    1
  )
$$;

create or replace function public.get_branch_staff_count(p_branch_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int from public.branch_staff where branch_id = p_branch_id
$$;

create or replace function public.get_branch_customer_count(p_branch_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int from public.customers where branch_id = p_branch_id and status = 'active'
$$;

create or replace function public.get_branch_booking_count(p_branch_id uuid, p_status text default null)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from public.bookings
  where branch_id = p_branch_id
    and (p_status is null or status = p_status)
$$;

create or replace function public.get_branch_revenue(p_branch_id uuid, p_from_date date default null, p_to_date date default null)
returns numeric(12,2)
language sql
stable
set search_path = public
as $$
  select coalesce(sum(total_amount), 0)::numeric(12,2)
  from public.pos_orders
  where branch_id = p_branch_id
    and order_status = 'completed'
    and payment_status = 'paid'
    and (p_from_date is null or created_at >= p_from_date::timestamptz)
    and (p_to_date is null or created_at < (p_to_date + 1)::timestamptz)
$$;

create or replace function public.get_branch_inventory_count(p_branch_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from public.products
  where branch_id = p_branch_id and is_active = true
$$;

create or replace function public.get_branch_low_stock_count(p_branch_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select count(*)::int
  from public.products
  where branch_id = p_branch_id
    and is_active = true
    and stock_quantity <= low_stock_threshold
$$;

create or replace function public.get_user_branch_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select branch_id
  from public.user_profiles
  where id = auth.uid()
    and status = 'active'
  limit 1
$$;
