-- Phase 29: Review collection system
-- Extends the existing reviews and notifications tables without deleting existing data.

alter table public.reviews add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.reviews add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.reviews add column if not exists staff_rating int check (staff_rating between 1 and 5);
alter table public.reviews add column if not exists service_rating int check (service_rating between 1 and 5);

create index if not exists reviews_staff_id_idx on public.reviews(staff_id);
create index if not exists reviews_service_id_idx on public.reviews(service_id);
create index if not exists reviews_pos_order_id_idx on public.reviews(pos_order_id);
create index if not exists reviews_business_status_created_idx on public.reviews(business_id, status, created_at desc);

drop function if exists public.get_public_review_context(uuid, uuid, uuid);
create function public.get_public_review_context(
  p_business_id uuid,
  p_booking_id uuid default null,
  p_pos_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_order public.pos_orders%rowtype;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_service_name text;
  v_staff_name text;
begin
  if p_booking_id is not null then
    select * into v_booking
    from public.bookings
    where id = p_booking_id
      and business_id = p_business_id
      and status = 'completed';

    if v_booking.id is null then
      return null;
    end if;

    select full_name, phone, email
      into v_customer_name, v_customer_phone, v_customer_email
    from public.customers
    where id = v_booking.customer_id;

    select name into v_service_name from public.services where id = v_booking.service_id;
    select full_name into v_staff_name from public.staff where id = v_booking.staff_id;

    return jsonb_build_object(
      'source', 'booking',
      'booking_id', v_booking.id,
      'pos_order_id', null,
      'customer_id', v_booking.customer_id,
      'staff_id', v_booking.staff_id,
      'service_id', v_booking.service_id,
      'customer_name', v_customer_name,
      'customer_phone', v_customer_phone,
      'customer_email', v_customer_email,
      'service_name', v_service_name,
      'staff_name', v_staff_name
    );
  end if;

  if p_pos_order_id is not null then
    select * into v_order
    from public.pos_orders
    where id = p_pos_order_id
      and business_id = p_business_id
      and order_status = 'completed';

    if v_order.id is null then
      return null;
    end if;

    select full_name, phone, email
      into v_customer_name, v_customer_phone, v_customer_email
    from public.customers
    where id = v_order.customer_id;

    select item_name into v_service_name
    from public.pos_order_items
    where order_id = v_order.id
      and item_type = 'service'
    order by created_at
    limit 1;

    select full_name into v_staff_name from public.staff where id = v_order.staff_id;

    return jsonb_build_object(
      'source', 'pos_order',
      'booking_id', null,
      'pos_order_id', v_order.id,
      'customer_id', v_order.customer_id,
      'staff_id', v_order.staff_id,
      'service_id', null,
      'customer_name', coalesce(v_customer_name, v_order.customer_name),
      'customer_phone', coalesce(v_customer_phone, v_order.customer_phone),
      'customer_email', v_customer_email,
      'service_name', v_service_name,
      'staff_name', v_staff_name
    );
  end if;

  return null;
end;
$$;

drop function if exists public.submit_public_review(uuid, int, text, text, text, text, text);
create function public.submit_public_review(
  p_business_id uuid,
  p_rating int,
  p_title text default null,
  p_comment text default null,
  p_customer_name text default null,
  p_phone text default null,
  p_email text default null,
  p_booking_id uuid default null,
  p_pos_order_id uuid default null,
  p_staff_rating int default null,
  p_service_rating int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_exists boolean;
  v_booking_found boolean := false;
  v_customer_id uuid;
  v_branch_id uuid;
  v_staff_id uuid;
  v_service_id uuid;
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

  if p_staff_rating is not null and (p_staff_rating < 1 or p_staff_rating > 5) then
    raise exception 'Staff rating must be between 1 and 5' using errcode = '22023';
  end if;

  if p_service_rating is not null and (p_service_rating < 1 or p_service_rating > 5) then
    raise exception 'Service rating must be between 1 and 5' using errcode = '22023';
  end if;

  if p_booking_id is not null then
    select customer_id, branch_id, staff_id, service_id
      into v_customer_id, v_branch_id, v_staff_id, v_service_id
    from public.bookings
    where id = p_booking_id
      and business_id = p_business_id
      and status = 'completed';

    v_booking_found := found;

    if not v_booking_found then
      raise exception 'Completed booking not found' using errcode = 'P0001';
    end if;
  end if;

  if p_pos_order_id is not null then
    select customer_id, branch_id, staff_id
      into v_customer_id, v_branch_id, v_staff_id
    from public.pos_orders
    where id = p_pos_order_id
      and business_id = p_business_id
      and order_status = 'completed';

    if not found then
      raise exception 'Completed order not found' using errcode = 'P0001';
    end if;
  end if;

  if v_customer_id is null and (
    nullif(trim(coalesce(p_phone, '')), '') is not null
    or nullif(trim(coalesce(p_email, '')), '') is not null
  ) then
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

  insert into public.reviews (
    business_id,
    branch_id,
    customer_id,
    booking_id,
    pos_order_id,
    staff_id,
    service_id,
    rating,
    staff_rating,
    service_rating,
    title,
    comment,
    source,
    status
  )
  values (
    p_business_id,
    v_branch_id,
    v_customer_id,
    p_booking_id,
    p_pos_order_id,
    v_staff_id,
    v_service_id,
    p_rating,
    coalesce(p_staff_rating, p_rating),
    coalesce(p_service_rating, p_rating),
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
    jsonb_build_object(
      'rating', p_rating,
      'staff_rating', coalesce(p_staff_rating, p_rating),
      'service_rating', coalesce(p_service_rating, p_rating),
      'booking_id', p_booking_id,
      'pos_order_id', p_pos_order_id
    )
  );

  return v_review_id;
end;
$$;

create or replace function public.seed_phase29_review_templates(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) and not public.has_business_access(p_business_id) then
    raise exception 'Not allowed to seed templates for this business' using errcode = 'P0001';
  end if;

  insert into public.notification_templates (business_id, notification_type, channel, subject, body, variables, is_default, is_active)
  values
    (
      p_business_id,
      'review_request',
      'whatsapp',
      null,
      'Hi {customer_name}, thank you for visiting {business_name}. Please rate your experience here: {review_link}',
      '["customer_name","business_name","review_link"]'::jsonb,
      true,
      true
    ),
    (
      p_business_id,
      'review_request',
      'email',
      'How was your visit to {business_name}?',
      'Hi {customer_name},<br><br>Thank you for visiting {business_name}. Please rate your experience here: {review_link}',
      '["customer_name","business_name","review_link"]'::jsonb,
      true,
      true
    )
  on conflict (business_id, notification_type, channel) do update set
    subject = excluded.subject,
    body = excluded.body,
    variables = excluded.variables,
    is_default = true,
    is_active = true,
    updated_at = now();
end;
$$;

grant execute on function public.get_public_review_context(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.submit_public_review(uuid, int, text, text, text, text, text, uuid, uuid, int, int) to anon, authenticated;
grant execute on function public.seed_phase29_review_templates(uuid) to authenticated;
