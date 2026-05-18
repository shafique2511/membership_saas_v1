-- Phase 3 schema completion and hardening.
-- Additive only: preserves existing data and keeps current app insert paths compatible.

alter table public.package_modules
  add column if not exists updated_at timestamptz not null default now();

alter table public.membership_usage
  add column if not exists updated_at timestamptz not null default now();

alter table public.loyalty_transactions
  add column if not exists updated_at timestamptz not null default now();

alter table public.inventory_transactions
  add column if not exists updated_at timestamptz not null default now();

alter table public.pos_order_items
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.pos_order_items poi
set business_id = po.business_id,
    branch_id = po.branch_id
from public.pos_orders po
where poi.order_id = po.id
  and poi.business_id is null;

alter table public.pos_order_items
  alter column business_id set not null;

alter table public.payments
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.notifications
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.billing_invoices
  add column if not exists updated_at timestamptz not null default now();

alter table public.audit_logs
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.sync_pos_order_item_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_business_id uuid;
  v_branch_id uuid;
begin
  select business_id, branch_id
  into v_business_id, v_branch_id
  from public.pos_orders
  where id = new.order_id;

  if v_business_id is null then
    raise exception 'POS order does not exist';
  end if;

  new.business_id := v_business_id;
  new.branch_id := v_branch_id;
  return new;
end;
$$;

drop trigger if exists sync_pos_order_item_tenant_before_write on public.pos_order_items;
create trigger sync_pos_order_item_tenant_before_write
before insert or update of order_id on public.pos_order_items
for each row execute function public.sync_pos_order_item_tenant();

drop trigger if exists set_package_modules_updated_at on public.package_modules;
create trigger set_package_modules_updated_at
before update on public.package_modules
for each row execute function public.set_updated_at();

drop trigger if exists set_membership_usage_updated_at on public.membership_usage;
create trigger set_membership_usage_updated_at
before update on public.membership_usage
for each row execute function public.set_updated_at();

drop trigger if exists set_loyalty_transactions_updated_at on public.loyalty_transactions;
create trigger set_loyalty_transactions_updated_at
before update on public.loyalty_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_transactions_updated_at on public.inventory_transactions;
create trigger set_inventory_transactions_updated_at
before update on public.inventory_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_pos_order_items_updated_at on public.pos_order_items;
create trigger set_pos_order_items_updated_at
before update on public.pos_order_items
for each row execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_invoices_updated_at on public.billing_invoices;
create trigger set_billing_invoices_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_audit_logs_updated_at on public.audit_logs;
create trigger set_audit_logs_updated_at
before update on public.audit_logs
for each row execute function public.set_updated_at();

create index if not exists package_modules_updated_at_idx on public.package_modules(updated_at);
create index if not exists pos_order_items_business_id_idx on public.pos_order_items(business_id);
create index if not exists pos_order_items_branch_id_idx on public.pos_order_items(branch_id);
create index if not exists payments_branch_id_idx on public.payments(branch_id);
create index if not exists notifications_branch_id_idx on public.notifications(branch_id);
create index if not exists billing_invoices_updated_at_idx on public.billing_invoices(updated_at);
create index if not exists audit_logs_updated_at_idx on public.audit_logs(updated_at);

create table if not exists public.backup_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  request_type text not null default 'business_full' check (request_type in ('business_full', 'single_table', 'uploaded_files', 'full_platform', 'single_business', 'database', 'storage', 'migration', 'shutdown')),
  scope text not null default 'business' check (scope in ('business', 'platform')),
  export_format text not null default 'zip' check (export_format in ('csv', 'excel', 'json', 'zip', 'sql')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'downloaded', 'expired', 'failed')),
  reason text,
  tables_included jsonb not null default '[]'::jsonb,
  storage_path text,
  signed_url_expires_at timestamptz,
  password_confirmed_at timestamptz,
  two_factor_confirmed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.backup_downloads (
  id uuid primary key default gen_random_uuid(),
  backup_request_id uuid not null references public.backup_requests(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  downloaded_by uuid references auth.users(id) on delete set null,
  ip_address inet,
  user_agent text,
  signed_url_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_shutdown_settings (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'normal' check (status in ('normal', 'planned_shutdown', 'export_only', 'fully_shutdown')),
  notice_enabled boolean not null default false,
  shutdown_date timestamptz,
  export_deadline timestamptz,
  support_email text,
  disable_new_business_registration boolean not null default false,
  disable_new_subscription_purchases boolean not null default false,
  owner_only_login_after_shutdown boolean not null default false,
  notice_message text,
  final_backup_request_id uuid references public.backup_requests(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  request_type text not null default 'business_data' check (request_type in ('business_data', 'customer_data', 'uploaded_files', 'full_tenant')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  reason text,
  legal_hold boolean not null default false,
  scheduled_for timestamptz,
  completed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  pos_order_id uuid references public.pos_orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  comment text,
  source text not null default 'customer_portal' check (source in ('customer_portal', 'manual', 'google', 'facebook', 'import')),
  status text not null default 'published' check (status in ('pending', 'published', 'hidden', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  requested_date date,
  requested_time_start time,
  requested_time_end time,
  party_size int not null default 1 check (party_size > 0),
  priority int not null default 0,
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'booked', 'expired', 'cancelled')),
  notes text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag text not null,
  color text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_id, tag)
);

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  note_type text not null default 'general' check (note_type in ('general', 'preference', 'complaint', 'follow_up', 'medical', 'internal')),
  title text,
  body text not null,
  is_private boolean not null default true,
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backup_requests_business_id_idx on public.backup_requests(business_id);
create index if not exists backup_requests_requested_by_idx on public.backup_requests(requested_by);
create index if not exists backup_requests_status_idx on public.backup_requests(status);
create index if not exists backup_downloads_backup_request_id_idx on public.backup_downloads(backup_request_id);
create index if not exists backup_downloads_business_id_idx on public.backup_downloads(business_id);
create index if not exists data_deletion_requests_business_id_idx on public.data_deletion_requests(business_id);
create index if not exists data_deletion_requests_customer_id_idx on public.data_deletion_requests(customer_id);
create index if not exists data_deletion_requests_status_idx on public.data_deletion_requests(status);
create index if not exists reviews_business_id_idx on public.reviews(business_id);
create index if not exists reviews_branch_id_idx on public.reviews(branch_id);
create index if not exists reviews_customer_id_idx on public.reviews(customer_id);
create index if not exists reviews_booking_id_idx on public.reviews(booking_id);
create index if not exists waitlist_entries_business_id_idx on public.waitlist_entries(business_id);
create index if not exists waitlist_entries_branch_id_idx on public.waitlist_entries(branch_id);
create index if not exists waitlist_entries_customer_id_idx on public.waitlist_entries(customer_id);
create index if not exists waitlist_entries_service_id_idx on public.waitlist_entries(service_id);
create index if not exists customer_tags_business_id_idx on public.customer_tags(business_id);
create index if not exists customer_tags_customer_id_idx on public.customer_tags(customer_id);
create index if not exists customer_tags_tag_idx on public.customer_tags(business_id, tag);
create index if not exists crm_notes_business_id_idx on public.crm_notes(business_id);
create index if not exists crm_notes_branch_id_idx on public.crm_notes(branch_id);
create index if not exists crm_notes_customer_id_idx on public.crm_notes(customer_id);
create index if not exists crm_notes_staff_id_idx on public.crm_notes(staff_id);
create index if not exists crm_notes_follow_up_at_idx on public.crm_notes(follow_up_at) where follow_up_at is not null;

drop trigger if exists set_backup_requests_updated_at on public.backup_requests;
create trigger set_backup_requests_updated_at before update on public.backup_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_backup_downloads_updated_at on public.backup_downloads;
create trigger set_backup_downloads_updated_at before update on public.backup_downloads
for each row execute function public.set_updated_at();

drop trigger if exists set_platform_shutdown_settings_updated_at on public.platform_shutdown_settings;
create trigger set_platform_shutdown_settings_updated_at before update on public.platform_shutdown_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_data_deletion_requests_updated_at on public.data_deletion_requests;
create trigger set_data_deletion_requests_updated_at before update on public.data_deletion_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_waitlist_entries_updated_at on public.waitlist_entries;
create trigger set_waitlist_entries_updated_at before update on public.waitlist_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_tags_updated_at on public.customer_tags;
create trigger set_customer_tags_updated_at before update on public.customer_tags
for each row execute function public.set_updated_at();

drop trigger if exists set_crm_notes_updated_at on public.crm_notes;
create trigger set_crm_notes_updated_at before update on public.crm_notes
for each row execute function public.set_updated_at();

alter table public.backup_requests enable row level security;
alter table public.backup_downloads enable row level security;
alter table public.platform_shutdown_settings enable row level security;
alter table public.data_deletion_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.customer_tags enable row level security;
alter table public.crm_notes enable row level security;

drop policy if exists "backup requests tenant or super admin read" on public.backup_requests;
create policy "backup requests tenant or super admin read" on public.backup_requests
for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or (business_id is not null and public.has_business_access(business_id))
);

drop policy if exists "backup requests tenant or super admin write" on public.backup_requests;
create policy "backup requests tenant or super admin write" on public.backup_requests
for all to authenticated
using (
  public.is_super_admin(auth.uid())
  or (
    business_id is not null
    and public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'data.backup.manage')
  )
)
with check (
  public.is_super_admin(auth.uid())
  or (
    business_id is not null
    and public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'data.backup.manage')
  )
);

drop policy if exists "backup downloads tenant or super admin read" on public.backup_downloads;
create policy "backup downloads tenant or super admin read" on public.backup_downloads
for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or (business_id is not null and public.has_business_access(business_id))
);

drop policy if exists "backup downloads tenant or super admin insert" on public.backup_downloads;
create policy "backup downloads tenant or super admin insert" on public.backup_downloads
for insert to authenticated
with check (
  public.is_super_admin(auth.uid())
  or (business_id is not null and public.has_business_access(business_id))
);

drop policy if exists "platform shutdown super admin all" on public.platform_shutdown_settings;
create policy "platform shutdown super admin all" on public.platform_shutdown_settings
for all to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists "platform shutdown owner read" on public.platform_shutdown_settings;
create policy "platform shutdown owner read" on public.platform_shutdown_settings
for select to authenticated
using (exists (
  select 1 from public.user_profiles up
  where up.id = auth.uid()
    and up.role in ('owner', 'manager')
));

drop policy if exists "data deletion tenant or super admin read" on public.data_deletion_requests;
create policy "data deletion tenant or super admin read" on public.data_deletion_requests
for select to authenticated
using (
  public.is_super_admin(auth.uid())
  or (business_id is not null and public.has_business_access(business_id))
);

drop policy if exists "data deletion tenant or super admin write" on public.data_deletion_requests;
create policy "data deletion tenant or super admin write" on public.data_deletion_requests
for all to authenticated
using (
  public.is_super_admin(auth.uid())
  or (business_id is not null and public.has_business_access(business_id))
)
with check (
  public.is_super_admin(auth.uid())
  or (business_id is not null and public.has_business_access(business_id))
);

drop policy if exists "reviews tenant read" on public.reviews;
create policy "reviews tenant read" on public.reviews
for select to authenticated
using (public.has_business_access(business_id));

drop policy if exists "reviews tenant write" on public.reviews;
create policy "reviews tenant write" on public.reviews
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

drop policy if exists "waitlist tenant all" on public.waitlist_entries;
create policy "waitlist tenant all" on public.waitlist_entries
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

drop policy if exists "customer tags tenant all" on public.customer_tags;
create policy "customer tags tenant all" on public.customer_tags
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

drop policy if exists "crm notes tenant all" on public.crm_notes;
create policy "crm notes tenant all" on public.crm_notes
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

insert into public.platform_shutdown_settings (status, notice_enabled, support_email, notice_message)
select 'normal', false, null, 'Luxantara Members is operating normally.'
where not exists (select 1 from public.platform_shutdown_settings);

insert into public.customer_tags (business_id, customer_id, tag, color)
select c.business_id, c.id, 'VIP', '#0f766e'
from public.customers c
where c.total_spent >= 1000
on conflict (business_id, customer_id, tag) do nothing;
