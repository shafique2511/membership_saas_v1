-- Luxantara Members - Phase 3 staff invitation support

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null check (role in ('manager', 'staff')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_staff_invitations_updated_at
before update on public.staff_invitations
for each row execute function public.set_updated_at();

create index if not exists staff_invitations_business_id_idx on public.staff_invitations(business_id);
create index if not exists staff_invitations_branch_id_idx on public.staff_invitations(branch_id);
create index if not exists staff_invitations_email_idx on public.staff_invitations(email);
create index if not exists staff_invitations_token_idx on public.staff_invitations(token);
create index if not exists staff_invitations_status_idx on public.staff_invitations(status);

alter table public.staff_invitations enable row level security;

create policy "staff invitations tenant read"
on public.staff_invitations
for select
to authenticated
using (
  public.has_business_access(business_id)
  or email = ((select auth.jwt()) ->> 'email')
);

create policy "staff invitations managers insert"
on public.staff_invitations
for insert
to authenticated
with check (
  public.has_business_access(business_id)
  and public.user_role(auth.uid()) in ('super_admin', 'owner', 'manager')
);

create policy "staff invitations managers update"
on public.staff_invitations
for update
to authenticated
using (
  public.has_business_access(business_id)
  or email = ((select auth.jwt()) ->> 'email')
)
with check (
  public.has_business_access(business_id)
  or email = ((select auth.jwt()) ->> 'email')
);

create policy "staff invitations managers delete"
on public.staff_invitations
for delete
to authenticated
using (
  public.has_business_access(business_id)
  and public.user_role(auth.uid()) in ('super_admin', 'owner', 'manager')
);
