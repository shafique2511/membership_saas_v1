-- Phase 19: Marketing module hardening.
-- Additive changes plus corrected segment-count RPC for current schema columns.

alter table public.promo_codes
  add column if not exists member_only boolean not null default false;

do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.marketing_campaigns'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%campaign_type%';

  if v_constraint_name is not null then
    execute format('alter table public.marketing_campaigns drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.marketing_campaigns
  add constraint marketing_campaigns_campaign_type_check
  check (campaign_type in ('promo_code', 'discount', 'member_only_promo', 'birthday', 'inactive_customer', 'referral', 'broadcast'));

create index if not exists promo_codes_business_member_active_idx
  on public.promo_codes (business_id, member_only, is_active);

create index if not exists customers_business_birthday_idx
  on public.customers (business_id, birthday)
  where birthday is not null;

create index if not exists customers_business_total_spent_idx
  on public.customers (business_id, total_spent);

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
  v_days integer := greatest(coalesce(nullif(p_criteria->>'days', '')::integer, 30), 1);
  v_min_spend numeric := greatest(coalesce(nullif(p_criteria->>'min_spend', '')::numeric, 1000), 0);
  v_service_id uuid := nullif(p_criteria->>'service_id', '')::uuid;
begin
  if not (public.has_business_access(p_business_id) or public.is_super_admin(auth.uid())) then
    raise exception 'Not allowed to calculate this business segment';
  end if;

  case p_segment_type
    when 'new_customers' then
      select count(*) into v_count
      from public.customers c
      where c.business_id = p_business_id
        and c.created_at >= now() - make_interval(days => v_days);

    when 'active_members' then
      select count(distinct m.customer_id) into v_count
      from public.memberships m
      where m.business_id = p_business_id
        and m.status = 'active';

    when 'expiring_members' then
      select count(distinct m.customer_id) into v_count
      from public.memberships m
      where m.business_id = p_business_id
        and m.status = 'active'
        and m.end_date between current_date and current_date + make_interval(days => v_days);

    when 'vip_customers' then
      select count(distinct c.id) into v_count
      from public.customers c
      left join public.memberships m
        on m.customer_id = c.id
       and m.business_id = c.business_id
       and m.status = 'active'
      left join public.membership_plans p
        on p.id = m.plan_id
       and p.business_id = c.business_id
      where c.business_id = p_business_id
        and (c.total_spent >= v_min_spend or p.plan_type = 'vip');

    when 'inactive_customers' then
      select count(*) into v_count
      from public.customers c
      where c.business_id = p_business_id
        and not exists (
          select 1
          from public.bookings b
          where b.business_id = c.business_id
            and b.customer_id = c.id
            and b.booking_date >= current_date - make_interval(days => v_days)
        );

    when 'birthday_month' then
      select count(*) into v_count
      from public.customers c
      where c.business_id = p_business_id
        and c.birthday is not null
        and extract(month from c.birthday) = extract(month from current_date);

    when 'high_spenders' then
      select count(*) into v_count
      from public.customers c
      where c.business_id = p_business_id
        and c.total_spent >= v_min_spend;

    when 'no_show_customers' then
      select count(distinct c.id) into v_count
      from public.customers c
      join public.bookings b
        on b.business_id = c.business_id
       and b.customer_id = c.id
      where c.business_id = p_business_id
        and b.status = 'no_show'
        and b.booking_date >= current_date - make_interval(days => v_days);

    when 'by_service' then
      if v_service_id is null then
        v_count := 0;
      else
        select count(distinct b.customer_id) into v_count
        from public.bookings b
        where b.business_id = p_business_id
          and b.service_id = v_service_id
          and b.customer_id is not null;
      end if;

    else
      select count(*) into v_count
      from public.customers c
      where c.business_id = p_business_id;
  end case;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.calculate_segment_count(uuid, text, jsonb) to authenticated;
