-- Luxantara Members - Phase 18: Customer Portal
-- Public business access, customer-facing RPCs

create or replace function public.get_public_business(p_business_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', b.id,
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
  where b.id = p_business_id and b.status = 'active'
$$;

create or replace function public.get_customer_bookings(p_customer_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'booking_type', b.booking_type,
      'booking_date', b.booking_date,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'status', b.status,
      'total_amount', b.total_amount,
      'payment_status', b.payment_status,
      'notes', b.notes,
      'created_at', b.created_at,
      'service_name', s.name,
      'staff_name', st.full_name,
      'branch_name', br.name
    )
    order by b.booking_date desc, b.start_time desc
  ), '[]'::jsonb)
  from public.bookings b
  left join public.services s on s.id = b.service_id
  left join public.staff st on st.id = b.staff_id
  left join public.branches br on br.id = b.branch_id
  where b.customer_id = p_customer_id
$$;

create or replace function public.get_customer_memberships(p_customer_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'plan_name', mp.name,
      'plan_type', mp.plan_type,
      'status', m.status,
      'start_date', m.start_date,
      'end_date', m.end_date,
      'remaining_credit', m.remaining_credit,
      'remaining_visits', m.remaining_visits,
      'auto_renew', m.auto_renew,
      'qr_code', m.qr_code,
      'business_name', b.name
    )
    order by m.end_date asc
  ), '[]'::jsonb)
  from public.memberships m
  join public.membership_plans mp on mp.id = m.plan_id
  join public.businesses b on b.id = m.business_id
  where m.customer_id = p_customer_id
$$;

create or replace function public.get_customer_payments(p_customer_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'payment_method', p.payment_method,
      'amount', p.amount,
      'status', p.status,
      'reference_type', p.reference_type,
      'reference_id', p.reference_id,
      'transaction_id', p.transaction_id,
      'paid_at', p.paid_at,
      'created_at', p.created_at
    )
    order by p.created_at desc
  ), '[]'::jsonb)
  from public.payments p
  where p.customer_id = p_customer_id
$$;

create or replace function public.get_customer_points_balance(p_customer_id uuid)
returns table (
  points_balance int,
  total_earned bigint,
  total_redeemed bigint,
  total_expired bigint
)
language sql
stable
set search_path = public
as $$
  select
    c.points_balance,
    coalesce(sum(case when lt.transaction_type = 'earn' then lt.points else 0 end), 0)::bigint as total_earned,
    coalesce(sum(case when lt.transaction_type = 'redeem' then lt.points else 0 end), 0)::bigint as total_redeemed,
    coalesce(sum(case when lt.transaction_type = 'expire' then lt.points else 0 end), 0)::bigint as total_expired
  from public.customers c
  left join public.loyalty_transactions lt on lt.customer_id = c.id
  where c.id = p_customer_id
    and c.user_id = auth.uid()
  group by c.points_balance
$$;

create or replace function public.get_customer_redeemable_rewards(p_business_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'description', r.description,
      'reward_type', r.reward_type,
      'points_required', r.points_required,
      'discount_amount', r.discount_amount,
      'discount_percent', r.discount_percent,
      'free_item', r.free_item
    )
    order by r.points_required asc
  ), '[]'::jsonb)
  from public.rewards r
  where r.business_id = p_business_id
    and r.is_active = true
$$;
