-- Luxantara Members - Phase 12: Staff & Commission Module

-- 1. Staff-service assignments
create table if not exists public.staff_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  commission_type text not null default 'percentage' check (commission_type in ('fixed', 'percentage')),
  commission_value numeric(12,2) not null default 0 check (commission_value >= 0),
  created_at timestamptz not null default now(),
  unique (staff_id, service_id)
);

-- 2. Commission rules
create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  commission_type text not null check (commission_type in ('fixed', 'percentage', 'service_based', 'product_based')),
  target_type text not null check (target_type in ('service', 'product', 'all')),
  target_id uuid,
  rate numeric(12,2) not null default 0 check (rate >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Commission records
create table if not exists public.commission_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  source_type text not null check (source_type in ('booking', 'pos_order', 'membership')),
  source_id uuid,
  commission_type text not null,
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Enhance staff table
alter table public.staff add column if not exists commission_type text not null default 'percentage' check (commission_type in ('fixed', 'percentage'));
alter table public.staff add column if not exists target_sales numeric(12,2) not null default 0 check (target_sales >= 0);
alter table public.staff add column if not exists target_bookings int not null default 0 check (target_bookings >= 0);
alter table public.staff add column if not exists notes text;

-- 5. RLS
alter table public.staff_services enable row level security;
alter table public.commission_rules enable row level security;
alter table public.commission_records enable row level security;

create policy "staff services tenant all" on public.staff_services
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy "commission rules tenant all" on public.commission_rules
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy "commission records tenant or staff read" on public.commission_records
  for select to authenticated using (
    public.has_business_access(business_id) or
    exists (select 1 from public.staff s where s.id = staff_id and s.user_id = auth.uid())
  );

create policy "commission records tenant write" on public.commission_records
  for all to authenticated using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

-- 6. Indexes
create index if not exists staff_services_staff_id_idx on public.staff_services(staff_id);
create index if not exists staff_services_service_id_idx on public.staff_services(service_id);
create index if not exists commission_rules_target_idx on public.commission_rules(target_type, target_id);
create index if not exists commission_records_staff_id_idx on public.commission_records(staff_id);
create index if not exists commission_records_status_idx on public.commission_records(status);
create index if not exists commission_records_source_idx on public.commission_records(source_type, source_id);

-- 7. Triggers
create trigger if not exists set_commission_rules_updated_at before update on public.commission_rules
  for each row execute function public.set_updated_at();
create trigger if not exists set_commission_records_updated_at before update on public.commission_records
  for each row execute function public.set_updated_at();
