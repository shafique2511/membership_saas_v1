-- Phase 2: Public business slugs for /b/{businessSlug} routes.
-- Non-destructive: adds a nullable slug first, backfills from existing names, then enforces uniqueness.

alter table public.businesses
  add column if not exists slug text;

create or replace function public.slugify_text(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, 'business')), '[^a-z0-9]+', '-', 'g'));
$$;

with prepared as (
  select
    id,
    coalesce(nullif(public.slugify_text(name), ''), 'business') as base_slug,
    row_number() over (
      partition by coalesce(nullif(public.slugify_text(name), ''), 'business')
      order by created_at nulls last, id
    ) as slug_rank
  from public.businesses
  where slug is null or trim(slug) = ''
),
final_slugs as (
  select
    id,
    case
      when slug_rank = 1 then base_slug
      else base_slug || '-' || slug_rank::text
    end as generated_slug
  from prepared
)
update public.businesses b
set slug = f.generated_slug
from final_slugs f
where b.id = f.id;

create unique index if not exists businesses_slug_unique_idx
  on public.businesses (slug)
  where slug is not null;

create index if not exists businesses_slug_lookup_idx
  on public.businesses (slug);

create or replace function public.set_business_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 1;
begin
  if new.slug is not null and trim(new.slug) <> '' then
    new.slug := public.slugify_text(new.slug);
  else
    new.slug := public.slugify_text(new.name);
  end if;

  v_base := coalesce(nullif(new.slug, ''), 'business');
  v_candidate := v_base;

  while exists (
    select 1
    from public.businesses b
    where b.slug = v_candidate
      and b.id <> new.id
  ) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix::text;
  end loop;

  new.slug := v_candidate;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_business_slug_before_write'
  ) then
    create trigger set_business_slug_before_write
      before insert or update of name, slug on public.businesses
      for each row
      execute function public.set_business_slug();
  end if;
end;
$$;

create or replace function public.resolve_business_slug(p_business_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select id
  into v_business_id
  from public.businesses
  where slug = p_business_slug
    and status = 'active'
  limit 1;

  return v_business_id;
end;
$$;

create or replace function public.get_public_business_by_slug(p_business_slug text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', b.id,
    'slug', b.slug,
    'name', b.name,
    'business_type', b.business_type,
    'logo_url', b.logo_url,
    'phone', b.phone,
    'whatsapp', b.whatsapp,
    'email', b.email,
    'address', b.address,
    'timezone', b.timezone
  )
  from public.businesses b
  where b.slug = p_business_slug
    and b.status = 'active'
  limit 1;
$$;

grant execute on function public.resolve_business_slug(text) to anon, authenticated;
grant execute on function public.get_public_business_by_slug(text) to anon, authenticated;

create or replace function public.create_guest_booking(
  p_business_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_staff_id uuid,
  p_service_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_booking_id uuid;
  v_total_amount numeric(12,2) := 0;
begin
  if not exists (
    select 1
    from public.businesses
    where id = p_business_id
      and status = 'active'
  ) then
    raise exception 'Business is not available';
  end if;

  if nullif(trim(p_full_name), '') is null or nullif(trim(p_phone), '') is null then
    raise exception 'Name and phone are required';
  end if;

  select coalesce(price, 0)
  into v_total_amount
  from public.services
  where id = p_service_id
    and business_id = p_business_id
    and is_active = true
    and is_bookable = true;

  insert into public.customers (business_id, full_name, phone, email, status)
  values (p_business_id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), 'active')
  returning id into v_customer_id;

  insert into public.bookings (
    business_id,
    customer_id,
    staff_id,
    service_id,
    booking_type,
    booking_date,
    start_time,
    end_time,
    total_amount,
    status,
    notes
  )
  values (
    p_business_id,
    v_customer_id,
    p_staff_id,
    p_service_id,
    'appointment',
    p_booking_date,
    p_start_time,
    p_end_time,
    v_total_amount,
    'pending',
    p_notes
  )
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

grant execute on function public.create_guest_booking(uuid, text, text, text, uuid, uuid, date, time, time, text) to anon, authenticated;
