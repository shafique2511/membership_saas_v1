-- Luxantara Members - Phase 11: Loyalty and rewards hardening
-- Additive/replace-only migration. Does not reset existing loyalty data.

alter table public.rewards drop constraint if exists rewards_reward_type_check;
alter table public.rewards
  add constraint rewards_reward_type_check
  check (reward_type in ('voucher', 'discount', 'free_service', 'free_item', 'birthday', 'referral', 'campaign'));

create index if not exists loyalty_transactions_reference_idx
  on public.loyalty_transactions(business_id, customer_id, reference_type, reference_id);
create index if not exists loyalty_transactions_type_created_idx
  on public.loyalty_transactions(business_id, transaction_type, created_at desc);
create index if not exists rewards_business_active_points_idx
  on public.rewards(business_id, is_active, points_required);

create or replace function public.ensure_loyalty_settings(p_business_id uuid)
returns public.loyalty_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.loyalty_settings%rowtype;
begin
  insert into public.loyalty_settings (business_id)
  values (p_business_id)
  on conflict (business_id) do nothing;

  select *
  into v_settings
  from public.loyalty_settings
  where business_id = p_business_id;

  return v_settings;
end;
$$;

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
  if coalesce(p_points, 0) <= 0 then
    return;
  end if;

  if not public.business_has_module_access(p_business_id, 'loyalty') then
    return;
  end if;

  if p_reference_id is not null and exists (
    select 1
    from public.loyalty_transactions
    where business_id = p_business_id
      and customer_id = p_customer_id
      and transaction_type = 'earn'
      and reference_type = p_reference_type
      and reference_id = p_reference_id
  ) then
    return;
  end if;

  update public.customers
  set points_balance = points_balance + p_points,
      updated_at = now()
  where id = p_customer_id
    and business_id = p_business_id
    and status = 'active'
  returning points_balance into v_current_balance;

  if v_current_balance is null then
    raise exception 'Customer is not available' using errcode = 'P0001';
  end if;

  insert into public.loyalty_transactions (
    business_id,
    customer_id,
    transaction_type,
    points,
    description,
    reference_type,
    reference_id,
    balance_after
  )
  values (
    p_business_id,
    p_customer_id,
    'earn',
    p_points,
    p_points || ' points earned',
    p_reference_type,
    p_reference_id,
    v_current_balance
  );
end;
$$;

create or replace function public.redeem_loyalty_points(
  p_business_id uuid,
  p_customer_id uuid,
  p_points int,
  p_reward_id uuid default null,
  p_reference_type text default 'reward',
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance int;
  v_reward public.rewards%rowtype;
begin
  if coalesce(p_points, 0) <= 0 then
    raise exception 'Redeemed points must be greater than zero' using errcode = 'P0001';
  end if;

  if not public.business_has_module_access(p_business_id, 'loyalty') then
    raise exception 'Loyalty module is not enabled for this business' using errcode = 'P0001';
  end if;

  if p_reward_id is not null then
    select *
    into v_reward
    from public.rewards
    where id = p_reward_id
      and business_id = p_business_id
      and is_active = true
    for update;

    if not found then
      raise exception 'Reward is not available' using errcode = 'P0001';
    end if;

    if v_reward.usage_limit is not null and v_reward.times_redeemed >= v_reward.usage_limit then
      raise exception 'Reward usage limit reached' using errcode = 'P0001';
    end if;

    if p_points < v_reward.points_required then
      raise exception 'Not enough points for this reward' using errcode = 'P0001';
    end if;
  end if;

  select points_balance
  into v_current_balance
  from public.customers
  where id = p_customer_id
    and business_id = p_business_id
    and status = 'active'
  for update;

  if v_current_balance is null then
    raise exception 'Customer is not available' using errcode = 'P0001';
  end if;

  if v_current_balance < p_points then
    raise exception 'Insufficient points' using errcode = 'P0002';
  end if;

  update public.customers
  set points_balance = points_balance - p_points,
      updated_at = now()
  where id = p_customer_id
    and business_id = p_business_id
  returning points_balance into v_current_balance;

  if p_reward_id is not null then
    update public.rewards
    set times_redeemed = times_redeemed + 1,
        updated_at = now()
    where id = p_reward_id;
  end if;

  insert into public.loyalty_transactions (
    business_id,
    customer_id,
    transaction_type,
    points,
    description,
    reference_type,
    reference_id,
    reward_id,
    balance_after
  )
  values (
    p_business_id,
    p_customer_id,
    'redeem',
    -p_points,
    p_points || ' points redeemed',
    p_reference_type,
    p_reference_id,
    p_reward_id,
    v_current_balance
  );
end;
$$;

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
  v_type text;
begin
  if not public.has_business_access(p_business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  update public.customers
  set points_balance = greatest(0, points_balance + p_points),
      updated_at = now()
  where id = p_customer_id
    and business_id = p_business_id
  returning points_balance into v_current_balance;

  if v_current_balance is null then
    raise exception 'Customer is not available' using errcode = 'P0001';
  end if;

  v_type := case when p_points < 0 then 'redeem' else 'adjust' end;

  insert into public.loyalty_transactions (
    business_id,
    customer_id,
    transaction_type,
    points,
    description,
    reference_type,
    created_by,
    balance_after
  )
  values (
    p_business_id,
    p_customer_id,
    v_type,
    p_points,
    coalesce(p_description, 'Manual points adjustment'),
    'manual',
    p_created_by,
    v_current_balance
  );
end;
$$;

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
  v_settings public.loyalty_settings%rowtype;
  v_points int;
  v_reward_id uuid;
begin
  v_settings := public.ensure_loyalty_settings(p_business_id);
  if not coalesce(v_settings.auto_award_birthday, true) then
    return;
  end if;

  insert into public.birthday_rewards (business_id, customer_id, reward_year, points_awarded, status, awarded_at)
  values (p_business_id, p_customer_id, p_year, v_settings.birthday_reward_points, 'awarded', now())
  on conflict (business_id, customer_id, reward_year) do nothing
  returning id, points_awarded into v_reward_id, v_points;

  if v_reward_id is not null then
    perform public.award_loyalty_points(p_business_id, p_customer_id, v_points, 'birthday', v_reward_id);
  end if;
end;
$$;

create or replace function public.award_referral_reward(p_referral_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referral_rewards%rowtype;
  v_settings public.loyalty_settings%rowtype;
  v_points int;
begin
  select *
  into v_referral
  from public.referral_rewards
  where id = p_referral_reward_id
  for update;

  if not found then
    raise exception 'Referral reward not found' using errcode = 'P0001';
  end if;

  if v_referral.status = 'rewarded' and v_referral.rewarded_at is not null then
    return;
  end if;

  v_settings := public.ensure_loyalty_settings(v_referral.business_id);
  if not coalesce(v_settings.auto_award_referral, true) then
    return;
  end if;

  v_points := coalesce(v_referral.points_awarded, v_settings.referral_reward_points, 200);

  update public.referral_rewards
  set status = 'rewarded',
      points_awarded = v_points,
      rewarded_at = now(),
      updated_at = now()
  where id = p_referral_reward_id;

  perform public.award_loyalty_points(v_referral.business_id, v_referral.referrer_customer_id, v_points, 'referral', p_referral_reward_id);
end;
$$;

create or replace function public.auto_award_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'rewarded' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.award_referral_reward(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists auto_award_referral_reward_trigger on public.referral_rewards;
create trigger auto_award_referral_reward_trigger
  after insert or update of status on public.referral_rewards
  for each row
  execute function public.auto_award_referral_reward();

create or replace function public.award_points_after_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.loyalty_settings%rowtype;
  v_business_id uuid;
  v_customer_id uuid;
  v_amount numeric(12,2);
  v_reference_type text;
  v_reference_id uuid;
  v_points int;
begin
  if new.status not in ('paid', 'verified') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status in ('paid', 'verified') then
    return new;
  end if;

  if new.customer_id is null then
    return new;
  end if;

  v_business_id := new.business_id;
  v_customer_id := new.customer_id;
  v_amount := new.amount;
  v_reference_type := 'payment';
  v_reference_id := new.id;

  if new.reference_type = 'pos_order' and new.reference_id is not null then
    select total_amount
    into v_amount
    from public.pos_orders
    where id = new.reference_id
      and business_id = new.business_id;

    v_reference_type := 'payment';
    v_reference_id := new.reference_id;
  end if;

  v_settings := public.ensure_loyalty_settings(v_business_id);
  v_points := floor(coalesce(v_amount, 0) / greatest(v_settings.earning_rate, 0.01))::int;

  if v_points > 0 then
    perform public.award_loyalty_points(v_business_id, v_customer_id, v_points, v_reference_type, v_reference_id);
  end if;

  return new;
end;
$$;

drop trigger if exists award_points_after_payment_trigger on public.payments;
create trigger award_points_after_payment_trigger
  after insert or update of status on public.payments
  for each row
  execute function public.award_points_after_payment();

create or replace function public.redeem_points_for_booking(
  p_business_id uuid,
  p_customer_id uuid,
  p_booking_id uuid,
  p_points int
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.loyalty_settings%rowtype;
  v_discount numeric(12,2);
begin
  v_settings := public.ensure_loyalty_settings(p_business_id);

  if p_points < v_settings.min_redemption_points then
    raise exception 'Minimum redemption points not met' using errcode = 'P0001';
  end if;

  v_discount := floor(p_points::numeric / v_settings.redemption_rate) * v_settings.redemption_discount_amount;

  perform public.redeem_loyalty_points(p_business_id, p_customer_id, p_points, null, 'booking', p_booking_id);

  update public.bookings
  set total_amount = greatest(0, total_amount - v_discount),
      notes = concat_ws(' | ', notes, 'Points discount: ' || p_points || ' pts = RM ' || v_discount),
      updated_at = now()
  where id = p_booking_id
    and business_id = p_business_id
    and customer_id = p_customer_id;

  return v_discount;
end;
$$;

create or replace function public.seed_default_loyalty_rewards(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_business_access(p_business_id) then
    raise exception 'Access denied' using errcode = 'P0001';
  end if;

  perform public.ensure_loyalty_settings(p_business_id);

  insert into public.rewards (business_id, name, description, reward_type, points_required, discount_amount, is_active)
  select p_business_id, 'RM5 Points Voucher', 'Redeem 100 points for RM5 discount.', 'voucher', 100, 5, true
  where not exists (select 1 from public.rewards where business_id = p_business_id and name = 'RM5 Points Voucher');

  insert into public.rewards (business_id, name, description, reward_type, points_required, free_item, item_name, is_active)
  select p_business_id, 'Free Item Reward', 'Redeem points for a free selected item.', 'free_item', 200, 'Free item', 'Selected item', true
  where not exists (select 1 from public.rewards where business_id = p_business_id and name = 'Free Item Reward');

  insert into public.rewards (business_id, name, description, reward_type, points_required, free_item, is_active)
  select p_business_id, 'Free Service Reward', 'Redeem points for a free selected service.', 'free_service', 300, 'Selected service', true
  where not exists (select 1 from public.rewards where business_id = p_business_id and name = 'Free Service Reward');

  insert into public.rewards (business_id, name, description, reward_type, points_required, is_active)
  select p_business_id, 'Birthday Reward', 'Default birthday reward worth 100 points.', 'birthday', 100, true
  where not exists (select 1 from public.rewards where business_id = p_business_id and name = 'Birthday Reward');

  insert into public.rewards (business_id, name, description, reward_type, points_required, is_active)
  select p_business_id, 'Referral Reward', 'Default referral reward worth 200 points.', 'referral', 200, true
  where not exists (select 1 from public.rewards where business_id = p_business_id and name = 'Referral Reward');
end;
$$;

grant execute on function public.ensure_loyalty_settings(uuid) to authenticated;
grant execute on function public.award_loyalty_points(uuid, uuid, int, text, uuid) to authenticated;
grant execute on function public.redeem_loyalty_points(uuid, uuid, int, uuid, text, uuid) to authenticated;
grant execute on function public.adjust_loyalty_points(uuid, uuid, int, text, uuid) to authenticated;
grant execute on function public.award_birthday_reward(uuid, uuid, int) to authenticated;
grant execute on function public.award_referral_reward(uuid) to authenticated;
grant execute on function public.redeem_points_for_booking(uuid, uuid, uuid, int) to authenticated;
grant execute on function public.seed_default_loyalty_rewards(uuid) to authenticated;
