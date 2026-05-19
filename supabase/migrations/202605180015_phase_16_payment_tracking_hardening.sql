-- Phase 16: payment tracking hardening
-- Additive migration. Keeps existing payment data and existing POS payment flows intact.

alter table public.payments drop constraint if exists payments_reference_type_check;
alter table public.payments
  add constraint payments_reference_type_check
  check (reference_type in ('booking', 'membership', 'pos_order', 'subscription', 'invoice', 'manual'));

alter table public.payments drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('cash', 'qr', 'card', 'bank_transfer', 'stripe', 'billplz', 'toyyibpay', 'senangpay', 'credit', 'points'));

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('unpaid', 'pending', 'verified', 'paid', 'failed', 'refunded', 'partial', 'cancelled'));

alter table public.payments
  add column if not exists external_reference text,
  add column if not exists gateway_provider text,
  add column if not exists gateway_status text,
  add column if not exists gateway_response jsonb not null default '{}'::jsonb,
  add column if not exists refunded_amount numeric(12,2) not null default 0 check (refunded_amount >= 0);

create index if not exists payments_business_status_created_idx on public.payments(business_id, status, created_at desc);
create index if not exists payments_gateway_provider_idx on public.payments(gateway_provider);

create table if not exists public.payment_gateway_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  provider text not null,
  event_type text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_gateway_events_business_id_idx on public.payment_gateway_events(business_id);
create index if not exists payment_gateway_events_payment_id_idx on public.payment_gateway_events(payment_id);

alter table public.payment_gateway_events enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "payment proofs tenant upload" on storage.objects;
create policy "payment proofs tenant upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and public.has_business_access((storage.foldername(name))[1]::uuid)
  and public.has_staff_permission((storage.foldername(name))[1]::uuid, 'payments.process')
);

drop policy if exists "payment gateway events tenant read" on public.payment_gateway_events;
create policy "payment gateway events tenant read" on public.payment_gateway_events
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'payment')
);

drop policy if exists "payment gateway events tenant insert" on public.payment_gateway_events;
create policy "payment gateway events tenant insert" on public.payment_gateway_events
for insert to authenticated
with check (
  public.has_business_access(business_id)
  and public.has_module_access(business_id, 'payment')
  and public.has_staff_permission(business_id, 'payments.process')
);

create or replace function public.sync_reference_payment_status(
  p_reference_type text,
  p_reference_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(12,2) := 0;
  v_refunded numeric(12,2) := 0;
  v_due numeric(12,2);
  v_status text := 'unpaid';
begin
  if p_reference_id is null or p_reference_type is null then
    return;
  end if;

  select
    coalesce(sum(greatest(amount - coalesce(refunded_amount, 0), 0)) filter (where status in ('paid', 'verified', 'partial')), 0),
    coalesce(sum(coalesce(refunded_amount, 0)), 0)
  into v_paid, v_refunded
  from public.payments
  where reference_type = p_reference_type
    and reference_id = p_reference_id;

  if p_reference_type = 'booking' then
    select total_amount into v_due from public.bookings where id = p_reference_id;
  elsif p_reference_type = 'pos_order' then
    select total_amount into v_due from public.pos_orders where id = p_reference_id;
  elsif p_reference_type = 'invoice' then
    select total into v_due from public.invoices where id = p_reference_id;
  elsif p_reference_type = 'subscription' then
    select amount into v_due from public.billing_invoices where id = p_reference_id;
  else
    return;
  end if;

  if v_due is null then
    return;
  end if;

  if v_paid >= v_due and v_due > 0 then
    v_status := 'paid';
  elsif v_paid > 0 then
    v_status := 'partial';
  elsif v_refunded > 0 then
    v_status := 'refunded';
  else
    v_status := 'unpaid';
  end if;

  if p_reference_type = 'booking' then
    update public.bookings
    set payment_status = v_status,
        updated_at = now()
    where id = p_reference_id;
  elsif p_reference_type = 'pos_order' then
    update public.pos_orders
    set payment_status = v_status,
        updated_at = now()
    where id = p_reference_id;
  elsif p_reference_type = 'invoice' then
    update public.invoices
    set status = case
          when v_status in ('paid', 'partial') then v_status
          when v_status = 'refunded' then 'issued'
          else status
        end,
        updated_at = now()
    where id = p_reference_id
      and status <> 'void';
  elsif p_reference_type = 'subscription' then
    update public.billing_invoices
    set status = case
          when v_status = 'paid' then 'paid'
          when v_status = 'partial' then 'issued'
          else status
        end,
        paid_at = case when v_status = 'paid' then coalesce(paid_at, now()) else paid_at end
    where id = p_reference_id
      and status <> 'void';
  end if;
end;
$$;

create or replace function public.sync_reference_payment_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (old.reference_type is distinct from new.reference_type or old.reference_id is distinct from new.reference_id) then
    perform public.sync_reference_payment_status(old.reference_type, old.reference_id);
  end if;

  perform public.sync_reference_payment_status(new.reference_type, new.reference_id);
  return new;
end;
$$;

drop trigger if exists sync_reference_payment_status_after_payment on public.payments;
create trigger sync_reference_payment_status_after_payment
  after insert or update of status, amount, refunded_amount, reference_type, reference_id on public.payments
  for each row execute function public.sync_reference_payment_status_trigger();

create or replace function public.record_payment(
  p_business_id uuid,
  p_customer_id uuid default null,
  p_reference_type text default 'manual',
  p_reference_id uuid default null,
  p_payment_method text default 'cash',
  p_amount numeric default 0,
  p_deposit_amount numeric default null,
  p_due_date date default null,
  p_notes text default null,
  p_proof_url text default null,
  p_transaction_id text default null,
  p_status text default null,
  p_gateway_provider text default null,
  p_gateway_status text default null,
  p_gateway_response jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_status text := coalesce(p_status, 'pending');
begin
  if not (
    public.has_business_access(p_business_id)
    and public.has_module_access(p_business_id, 'payment')
    and public.has_staff_permission(p_business_id, 'payments.process')
  ) then
    raise exception 'Not allowed to record payments' using errcode = 'P0001';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = 'P0001';
  end if;

  if p_reference_type not in ('booking', 'membership', 'pos_order', 'subscription', 'invoice', 'manual') then
    raise exception 'Unsupported payment reference type' using errcode = 'P0001';
  end if;

  if p_payment_method not in ('cash', 'qr', 'card', 'bank_transfer', 'stripe', 'billplz', 'toyyibpay', 'senangpay', 'credit', 'points') then
    raise exception 'Unsupported payment method' using errcode = 'P0001';
  end if;

  if v_status not in ('unpaid', 'pending', 'verified', 'paid', 'failed', 'refunded', 'partial', 'cancelled') then
    raise exception 'Unsupported payment status' using errcode = 'P0001';
  end if;

  insert into public.payments (
    business_id,
    customer_id,
    reference_type,
    reference_id,
    payment_method,
    amount,
    deposit_amount,
    status,
    proof_url,
    transaction_id,
    external_reference,
    gateway_provider,
    gateway_status,
    gateway_response,
    due_date,
    notes,
    paid_at
  )
  values (
    p_business_id,
    p_customer_id,
    p_reference_type,
    p_reference_id,
    p_payment_method,
    p_amount,
    p_deposit_amount,
    v_status,
    p_proof_url,
    p_transaction_id,
    p_transaction_id,
    p_gateway_provider,
    p_gateway_status,
    coalesce(p_gateway_response, '{}'::jsonb),
    p_due_date,
    p_notes,
    case when v_status in ('paid', 'verified') then now() else null end
  )
  returning id into v_payment_id;

  if p_gateway_provider is not null then
    insert into public.payment_gateway_events (business_id, payment_id, provider, event_type, status, payload)
    values (
      p_business_id,
      v_payment_id,
      p_gateway_provider,
      'mock_payment_created',
      coalesce(p_gateway_status, v_status),
      coalesce(p_gateway_response, '{}'::jsonb)
    );
  end if;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    p_business_id,
    auth.uid(),
    'payment.recorded',
    'payments',
    v_payment_id,
    null,
    jsonb_build_object('reference_type', p_reference_type, 'payment_method', p_payment_method, 'amount', p_amount, 'status', v_status)
  );

  return v_payment_id;
end;
$$;

create or replace function public.verify_payment(
  p_payment_id uuid,
  p_verified_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0001';
  end if;

  if not (
    public.has_business_access(v_payment.business_id)
    and public.has_module_access(v_payment.business_id, 'payment')
    and public.has_staff_permission(v_payment.business_id, 'payments.process')
  ) then
    raise exception 'Not allowed to verify payments' using errcode = 'P0001';
  end if;

  if v_payment.status not in ('pending', 'unpaid') then
    raise exception 'Only pending or unpaid payments can be verified' using errcode = 'P0001';
  end if;

  update public.payments
  set status = 'paid',
      verified_by = coalesce(p_verified_by, auth.uid()),
      verified_at = now(),
      paid_at = coalesce(paid_at, now()),
      gateway_status = coalesce(gateway_status, 'verified'),
      updated_at = now()
  where id = p_payment_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (v_payment.business_id, auth.uid(), 'payment.verified', 'payments', p_payment_id, to_jsonb(v_payment), jsonb_build_object('status', 'paid'));
end;
$$;

create or replace function public.process_refund(
  p_payment_id uuid,
  p_amount numeric(12,2),
  p_reason text default 'Customer requested refund'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_new_refunded numeric(12,2);
  v_refund_id uuid;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0001';
  end if;

  if not (
    public.has_business_access(v_payment.business_id)
    and public.has_module_access(v_payment.business_id, 'payment')
    and public.has_staff_permission(v_payment.business_id, 'payments.refund')
  ) then
    raise exception 'Not allowed to refund payments' using errcode = 'P0001';
  end if;

  if v_payment.status not in ('paid', 'verified', 'partial') then
    raise exception 'Payment is not in a refundable state' using errcode = 'P0001';
  end if;

  if p_amount <= 0 then
    raise exception 'Refund amount must be greater than zero' using errcode = 'P0001';
  end if;

  v_new_refunded := coalesce(v_payment.refunded_amount, 0) + p_amount;

  if v_new_refunded > v_payment.amount then
    raise exception 'Refund amount exceeds remaining paid amount' using errcode = 'P0001';
  end if;

  insert into public.refunds (business_id, payment_id, amount, reason, status)
  values (v_payment.business_id, p_payment_id, p_amount, p_reason, 'pending')
  returning id into v_refund_id;

  update public.payments
  set refunded_amount = v_new_refunded,
      status = case when v_new_refunded >= amount then 'refunded' else 'partial' end,
      updated_at = now()
  where id = p_payment_id;

  insert into public.audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    v_payment.business_id,
    auth.uid(),
    'payment.refund_requested',
    'refunds',
    v_refund_id,
    null,
    jsonb_build_object('payment_id', p_payment_id, 'amount', p_amount, 'reason', p_reason)
  );
end;
$$;

grant execute on function public.sync_reference_payment_status(text, uuid) to authenticated;
grant execute on function public.record_payment(uuid, uuid, text, uuid, text, numeric, numeric, date, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.verify_payment(uuid, uuid) to authenticated;
grant execute on function public.process_refund(uuid, numeric, text) to authenticated;
