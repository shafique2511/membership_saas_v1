-- Luxantara Members - Phase 13: Payment Module

-- 1. Enhance payments table: add deposit_amount, partial status
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('unpaid', 'pending', 'verified', 'paid', 'failed', 'refunded', 'partial', 'cancelled'));

alter table public.payments add column if not exists deposit_amount numeric(12,2);
alter table public.payments add column if not exists due_date date;
alter table public.payments add column if not exists notes text;
alter table public.payments add column if not exists verified_by uuid references public.user_profiles(id) on delete set null;
alter table public.payments add column if not exists verified_at timestamptz;

-- 2. Payment settings
create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  enabled_methods jsonb not null default '["cash","qr","card","bank_transfer"]'::jsonb,
  gateway_stripe jsonb default '{"enabled":false,"publishable_key":"","secret_key":""}'::jsonb,
  gateway_billplz jsonb default '{"enabled":false,"api_key":"","collection_id":""}'::jsonb,
  gateway_toyyibpay jsonb default '{"enabled":false,"api_key":"","category_code":""}'::jsonb,
  gateway_senangpay jsonb default '{"enabled":false,"merchant_id":"","secret_key":""}'::jsonb,
  invoice_prefix text not null default 'INV-',
  receipt_prefix text not null default 'RCP-',
  next_invoice_number integer not null default 1,
  next_receipt_number integer not null default 1,
  require_proof_for text[] not null default array['bank_transfer'],
  auto_verify_online boolean not null default true,
  payment_terms_days integer not null default 30,
  deposit_percentage numeric(5,2) default 50.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

-- 3. Refunds table
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  refund_method text,
  processed_by uuid references public.user_profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Receipts table (non-POS)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  receipt_number text not null,
  receipt_data jsonb not null default '{}'::jsonb,
  recipient_email text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, receipt_number)
);

-- 5. Invoice generation table (business-facing invoices, not billing_invoices)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  reference_type text check (reference_type in ('booking', 'membership', 'pos_order', 'subscription', 'manual')),
  reference_id uuid,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'partial', 'overdue', 'void')),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

-- 6. RPC: process_refund(p_payment_id, p_amount, p_reason)
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
  v_payment record;
  v_business_id uuid;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0001';
  end if;

  v_business_id := v_payment.business_id;

  if v_payment.status not in ('paid', 'partial') then
    raise exception 'Payment is not in a refundable state' using errcode = 'P0001';
  end if;

  if p_amount > v_payment.amount then
    raise exception 'Refund amount exceeds payment amount' using errcode = 'P0001';
  end if;

  -- Create refund record
  insert into public.refunds (business_id, payment_id, amount, reason, status)
  values (v_business_id, p_payment_id, p_amount, p_reason, 'pending');

  -- Update payment status
  if p_amount >= v_payment.amount then
    update public.payments set status = 'refunded' where id = p_payment_id;
  else
    update public.payments set status = 'partial' where id = p_payment_id;
  end if;
end;
$$;

grant execute on function public.process_refund(uuid, numeric, text) to authenticated;

-- 7. RPC: verify_payment(p_payment_id, p_verified_by)
create or replace function public.verify_payment(
  p_payment_id uuid,
  p_verified_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set status = 'paid',
      verified_by = p_verified_by,
      verified_at = now(),
      paid_at = coalesce(paid_at, now())
  where id = p_payment_id
    and status = 'pending';
end;
$$;

grant execute on function public.verify_payment(uuid, uuid) to authenticated;

-- 8. RPC: generate_invoice_number(business_id) returns text
create or replace function public.generate_invoice_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_number text;
begin
  select * into v_settings from public.payment_settings where business_id = p_business_id;
  if not found then
    v_number := 'INV-1001';
  else
    v_number := v_settings.invoice_prefix || (v_settings.next_invoice_number)::text;
    update public.payment_settings
    set next_invoice_number = next_invoice_number + 1
    where business_id = p_business_id;
  end if;
  return v_number;
end;
$$;

grant execute on function public.generate_invoice_number(uuid) to authenticated;

-- 9. RPC: generate_receipt_number(business_id) returns text
create or replace function public.generate_receipt_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_number text;
begin
  select * into v_settings from public.payment_settings where business_id = p_business_id;
  if not found then
    v_number := 'RCP-1001';
  else
    v_number := v_settings.receipt_prefix || (v_settings.next_receipt_number)::text;
    update public.payment_settings
    set next_receipt_number = next_receipt_number + 1
    where business_id = p_business_id;
  end if;
  return v_number;
end;
$$;

grant execute on function public.generate_receipt_number(uuid) to authenticated;

-- 10. Indexes
create index if not exists refunds_business_id_idx on public.refunds(business_id);
create index if not exists refunds_payment_id_idx on public.refunds(payment_id);
create index if not exists receipts_business_id_idx on public.receipts(business_id);
create index if not exists receipts_payment_id_idx on public.receipts(payment_id);
create index if not exists invoices_business_id_idx on public.invoices(business_id);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists payment_settings_business_id_idx on public.payment_settings(business_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_reference_idx on public.payments(reference_type, reference_id);

-- 11. RLS
alter table public.payment_settings enable row level security;
alter table public.refunds enable row level security;
alter table public.receipts enable row level security;
alter table public.invoices enable row level security;

-- Payment settings
create policy "payment settings tenant read" on public.payment_settings
  for select to authenticated using (
    public.has_module_access(business_id, 'payment')
    and (public.has_business_access(business_id) or public.is_super_admin(auth.uid()))
  );

create policy "payment settings tenant write" on public.payment_settings
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  );

-- Refunds
create policy "refunds tenant all" on public.refunds
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  );

-- Receipts
create policy "receipts tenant all" on public.receipts
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  );

-- Invoices
create policy "invoices tenant all" on public.invoices
  for all to authenticated using (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  ) with check (
    public.has_business_access(business_id) and public.has_module_access(business_id, 'payment')
  );
