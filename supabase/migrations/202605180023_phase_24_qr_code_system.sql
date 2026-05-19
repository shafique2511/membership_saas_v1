create table if not exists public.qr_code_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  qr_type text not null check (qr_type in (
    'business_public',
    'booking',
    'membership_signup',
    'loyalty_points',
    'customer_portal',
    'table_booking',
    'review'
  )),
  name text not null,
  target_url text not null,
  label text,
  description text,
  table_number text,
  style_config jsonb not null default '{}'::jsonb,
  scan_count int not null default 0 check (scan_count >= 0),
  last_scanned_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_code_scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  qr_code_id uuid references public.qr_code_assets(id) on delete set null,
  qr_type text,
  target_url text,
  user_agent text,
  scanned_at timestamptz not null default now()
);

create index if not exists qr_code_assets_business_id_idx on public.qr_code_assets(business_id);
create index if not exists qr_code_assets_branch_id_idx on public.qr_code_assets(branch_id);
create index if not exists qr_code_assets_business_type_idx on public.qr_code_assets(business_id, qr_type);
create index if not exists qr_code_assets_active_idx on public.qr_code_assets(business_id, is_active);
create index if not exists qr_code_scans_business_id_idx on public.qr_code_scans(business_id);
create index if not exists qr_code_scans_qr_code_id_idx on public.qr_code_scans(qr_code_id);
create index if not exists qr_code_scans_business_scanned_at_idx on public.qr_code_scans(business_id, scanned_at desc);

drop trigger if exists set_qr_code_assets_updated_at on public.qr_code_assets;
create trigger set_qr_code_assets_updated_at before update on public.qr_code_assets
for each row execute function public.set_updated_at();

alter table public.qr_code_assets enable row level security;
alter table public.qr_code_scans enable row level security;

drop policy if exists "qr code assets tenant read" on public.qr_code_assets;
create policy "qr code assets tenant read" on public.qr_code_assets
for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'settings.manage')
  )
);

drop policy if exists "qr code assets tenant write" on public.qr_code_assets;
create policy "qr code assets tenant write" on public.qr_code_assets
for all to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'settings.manage')
  )
)
with check (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'settings.manage')
  )
);

drop policy if exists "qr code scans tenant read" on public.qr_code_scans;
create policy "qr code scans tenant read" on public.qr_code_scans
for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'settings.manage')
  )
);

create or replace function public.seed_default_qr_code_assets(
  p_business_id uuid,
  p_base_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_base_url text := trim(trailing '/' from coalesce(nullif(p_base_url, ''), ''));
  v_public_base text;
begin
  if not public.is_super_admin(auth.uid()) and not (
    public.has_business_access(p_business_id)
    and public.has_staff_permission(p_business_id, 'settings.manage')
  ) then
    raise exception 'Not allowed to manage QR codes for this business' using errcode = 'P0001';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id
    and status <> 'deleted';

  if v_business.id is null then
    raise exception 'Business not found' using errcode = 'P0001';
  end if;

  v_public_base := v_base_url || '/b/' || coalesce(nullif(v_business.slug, ''), v_business.id::text);

  insert into public.qr_code_assets (business_id, qr_type, name, label, description, target_url, created_by)
  select p_business_id, qr_type, name, label, description, target_url, auth.uid()
  from (
    values
      ('business_public', 'Business public page', 'Visit our page', 'Open the public business page with services, contact details, and booking entry points.', v_public_base),
      ('booking', 'Booking page', 'Book your next appointment', 'Counter QR for barber, salon, spa, clinic, event, room, or table booking flows.', v_public_base || '/book?source=qr&intent=booking'),
      ('membership_signup', 'Membership signup', 'Join our membership', 'Membership signup QR for coffee shop tables, counters, and customer onboarding.', v_public_base || '/register?source=qr&intent=membership'),
      ('loyalty_points', 'Loyalty points', 'Collect and redeem points', 'Counter QR for customers to access rewards and loyalty points.', v_public_base || '/rewards?source=qr&intent=loyalty'),
      ('customer_portal', 'Customer portal', 'Open customer portal', 'Member QR for customers to view membership, rewards, bookings, and profile.', v_public_base || '/portal?source=qr&intent=portal'),
      ('table_booking', 'Table booking', 'Book a table', 'Coffee shop table QR for table booking or room booking workflows.', v_public_base || '/book?source=qr&intent=table'),
      ('review', 'Review page', 'Leave a review', 'Receipt QR for collecting customer reviews after payment or visit.', v_public_base || '/review?source=qr&intent=review')
  ) as defaults(qr_type, name, label, description, target_url)
  where not exists (
    select 1
    from public.qr_code_assets q
    where q.business_id = p_business_id
      and q.qr_type = defaults.qr_type
      and q.table_number is null
  );

  insert into public.audit_logs (business_id, user_id, action, table_name, new_data)
  values (
    p_business_id,
    auth.uid(),
    'qr_codes.seed_defaults',
    'qr_code_assets',
    jsonb_build_object('base_url', v_base_url)
  );
end;
$$;

create or replace function public.log_qr_code_scan(
  p_qr_code_id uuid default null,
  p_business_id uuid default null,
  p_qr_type text default null,
  p_target_url text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.qr_code_assets%rowtype;
  v_business_id uuid;
  v_qr_type text;
  v_target_url text;
begin
  if p_qr_code_id is not null then
    select * into v_asset
    from public.qr_code_assets
    where id = p_qr_code_id
      and is_active = true;

    if v_asset.id is null then
      return;
    end if;

    v_business_id := v_asset.business_id;
    v_qr_type := v_asset.qr_type;
    v_target_url := v_asset.target_url;

    update public.qr_code_assets
    set scan_count = scan_count + 1,
        last_scanned_at = now()
    where id = v_asset.id;
  else
    v_business_id := p_business_id;
    v_qr_type := p_qr_type;
    v_target_url := p_target_url;
  end if;

  if v_business_id is null then
    return;
  end if;

  insert into public.qr_code_scans (business_id, qr_code_id, qr_type, target_url, user_agent)
  values (v_business_id, p_qr_code_id, v_qr_type, v_target_url, left(p_user_agent, 1000));
end;
$$;

create or replace function public.submit_public_review(
  p_business_id uuid,
  p_rating int,
  p_title text default null,
  p_comment text default null,
  p_customer_name text default null,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_exists boolean;
  v_customer_id uuid;
  v_review_id uuid;
begin
  select exists (
    select 1
    from public.businesses
    where id = p_business_id
      and status = 'active'
  ) into v_business_exists;

  if not v_business_exists then
    raise exception 'Business not found' using errcode = 'P0001';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is not null or nullif(trim(coalesce(p_email, '')), '') is not null then
    select id into v_customer_id
    from public.customers
    where business_id = p_business_id
      and (
        (nullif(trim(coalesce(p_phone, '')), '') is not null and phone = nullif(trim(p_phone), ''))
        or (nullif(trim(coalesce(p_email, '')), '') is not null and email = nullif(trim(p_email), ''))
      )
    order by created_at desc
    limit 1;

    if v_customer_id is null then
      insert into public.customers (business_id, full_name, phone, email)
      values (
        p_business_id,
        coalesce(nullif(trim(p_customer_name), ''), 'Review customer'),
        nullif(trim(p_phone), ''),
        nullif(trim(p_email), '')
      )
      returning id into v_customer_id;
    end if;
  end if;

  insert into public.reviews (business_id, customer_id, rating, title, comment, source, status)
  values (
    p_business_id,
    v_customer_id,
    p_rating,
    nullif(trim(p_title), ''),
    nullif(trim(p_comment), ''),
    'customer_portal',
    'pending'
  )
  returning id into v_review_id;

  insert into public.audit_logs (business_id, action, table_name, record_id, new_data)
  values (
    p_business_id,
    'review.public_submit',
    'reviews',
    v_review_id,
    jsonb_build_object('rating', p_rating, 'has_customer', v_customer_id is not null)
  );

  return v_review_id;
end;
$$;

grant execute on function public.seed_default_qr_code_assets(uuid, text) to authenticated;
grant execute on function public.log_qr_code_scan(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.submit_public_review(uuid, int, text, text, text, text, text) to anon, authenticated;
