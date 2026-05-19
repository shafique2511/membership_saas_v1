-- Phase 20: Simple CRM hardening.
-- Additive schema support and stricter permission-aware RLS for customer tags and CRM notes.

create index if not exists customers_business_total_spent_desc_idx
  on public.customers (business_id, total_spent desc);

create index if not exists customers_business_no_show_count_idx
  on public.customers (business_id, no_show_count)
  where no_show_count > 0;

create index if not exists bookings_business_customer_status_date_idx
  on public.bookings (business_id, customer_id, status, booking_date desc);

create index if not exists pos_orders_business_customer_idx
  on public.pos_orders (business_id, customer_id)
  where customer_id is not null;

drop policy if exists "customer tags tenant all" on public.customer_tags;
create policy "customer tags tenant read" on public.customer_tags
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'customers.view_basic')
);

create policy "customer tags permitted write" on public.customer_tags
for all to authenticated
using (
  public.has_business_access(business_id)
  and (
    public.has_staff_permission(business_id, 'crm.tags.manage')
    or public.has_staff_permission(business_id, 'customers.edit')
    or public.has_staff_permission(business_id, 'customers.manage')
  )
)
with check (
  public.has_business_access(business_id)
  and (
    public.has_staff_permission(business_id, 'crm.tags.manage')
    or public.has_staff_permission(business_id, 'customers.edit')
    or public.has_staff_permission(business_id, 'customers.manage')
  )
);

drop policy if exists "crm notes tenant all" on public.crm_notes;
create policy "crm notes tenant read" on public.crm_notes
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'customers.view_basic')
);

create policy "crm notes permitted insert" on public.crm_notes
for insert to authenticated
with check (
  public.has_business_access(business_id)
  and (
    public.has_staff_permission(business_id, 'crm.notes.add')
    or public.has_staff_permission(business_id, 'customers.edit')
    or public.has_staff_permission(business_id, 'customers.manage')
  )
);

create policy "crm notes permitted update delete" on public.crm_notes
for all to authenticated
using (
  public.has_business_access(business_id)
  and (
    public.has_staff_permission(business_id, 'customers.edit')
    or public.has_staff_permission(business_id, 'customers.manage')
  )
)
with check (
  public.has_business_access(business_id)
  and (
    public.has_staff_permission(business_id, 'customers.edit')
    or public.has_staff_permission(business_id, 'customers.manage')
  )
);

create or replace function public.default_role_permission(target_role text, target_permission_key text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when target_role in ('super_admin', 'owner') then true
    when target_role = 'manager' then target_permission_key = any(array[
      'core.access',
      'customers.manage',
      'customers.view_basic',
      'customers.create',
      'customers.edit',
      'crm.notes.add',
      'crm.tags.manage',
      'bookings.manage',
      'bookings.view',
      'bookings.create',
      'bookings.edit',
      'bookings.cancel',
      'bookings.check_in',
      'bookings.update_status',
      'bookings.create_walk_in',
      'memberships.manage',
      'memberships.view',
      'memberships.assign',
      'pos.access',
      'pos.discount',
      'inventory.view',
      'inventory.adjust',
      'payments.process',
      'payments.view',
      'reports.manage',
      'reports.view',
      'loyalty.manage',
      'notifications.manage',
      'marketing.manage',
      'branches.manage'
    ])
    when target_role = 'staff' then target_permission_key = any(array[
      'core.access',
      'customers.view_basic',
      'bookings.view_assigned',
      'bookings.view',
      'bookings.update_status',
      'bookings.create_walk_in'
    ])
    when target_role = 'customer' then target_permission_key = any(array[
      'customer.profile.view',
      'customer.booking.create',
      'customer.membership.view',
      'customer.rewards.view',
      'customer.history.view'
    ])
    else false
  end
$$;

insert into public.customer_tags (business_id, customer_id, tag, color)
select c.business_id, c.id, 'High Spender', '#ca8a04'
from public.customers c
where c.total_spent >= 1000
on conflict (business_id, customer_id, tag) do nothing;

insert into public.customer_tags (business_id, customer_id, tag, color)
select c.business_id, c.id, 'No Show', '#dc2626'
from public.customers c
where c.no_show_count > 0
on conflict (business_id, customer_id, tag) do nothing;

insert into public.customer_tags (business_id, customer_id, tag, color)
select c.business_id, c.id, 'Birthday This Month', '#db2777'
from public.customers c
where c.birthday is not null
  and extract(month from c.birthday) = extract(month from current_date)
on conflict (business_id, customer_id, tag) do nothing;
