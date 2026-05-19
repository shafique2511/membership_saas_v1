-- Phase 18: Reports module query indexes.
-- Safe for existing databases: additive indexes only, no data changes.

create index if not exists bookings_business_date_status_idx
  on public.bookings (business_id, booking_date, status);

create index if not exists bookings_business_branch_staff_date_idx
  on public.bookings (business_id, branch_id, staff_id, booking_date);

create index if not exists payments_business_paid_status_idx
  on public.payments (business_id, paid_at, status)
  where paid_at is not null;

create index if not exists payments_business_created_status_idx
  on public.payments (business_id, created_at, status);

create index if not exists pos_orders_business_created_status_idx
  on public.pos_orders (business_id, created_at, order_status);

create index if not exists pos_orders_business_branch_staff_created_idx
  on public.pos_orders (business_id, branch_id, staff_id, created_at);

create index if not exists loyalty_transactions_business_created_type_idx
  on public.loyalty_transactions (business_id, created_at, transaction_type);

create index if not exists inventory_transactions_business_created_type_idx
  on public.inventory_transactions (business_id, created_at, transaction_type);

create index if not exists products_business_branch_stock_idx
  on public.products (business_id, branch_id, stock_quantity, low_stock_threshold);

create index if not exists memberships_business_status_end_date_idx
  on public.memberships (business_id, status, end_date);

create index if not exists marketing_campaigns_business_created_status_idx
  on public.marketing_campaigns (business_id, created_at, status);

create index if not exists campaign_results_business_campaign_idx
  on public.campaign_results (business_id, campaign_id);
