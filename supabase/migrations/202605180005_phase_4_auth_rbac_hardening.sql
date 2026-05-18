-- Phase 4 auth/RBAC hardening.
-- Keeps existing auth flows, but aligns staff invitations with owner-granted permissions.

drop policy if exists "staff invitations managers insert" on public.staff_invitations;
create policy "staff invitations permission insert"
on public.staff_invitations
for insert
to authenticated
with check (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'staff.manage')
);

drop policy if exists "staff invitations managers update" on public.staff_invitations;
create policy "staff invitations permission update"
on public.staff_invitations
for update
to authenticated
using (
  email = ((select auth.jwt()) ->> 'email')
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'staff.manage')
  )
)
with check (
  email = ((select auth.jwt()) ->> 'email')
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'staff.manage')
  )
);

drop policy if exists "staff invitations managers delete" on public.staff_invitations;
create policy "staff invitations permission delete"
on public.staff_invitations
for delete
to authenticated
using (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'staff.manage')
);

drop policy if exists "profiles update own profile" on public.user_profiles;
create policy "profiles update own profile"
on public.user_profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'staff.manage')
  )
)
with check (
  id = auth.uid()
  or public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'staff.manage')
  )
);

drop policy if exists "profiles insert by managers" on public.user_profiles;
create policy "profiles insert by staff managers"
on public.user_profiles
for insert
to authenticated
with check (
  public.is_super_admin(auth.uid())
  or (
    public.has_business_access(business_id)
    and public.has_staff_permission(business_id, 'staff.manage')
  )
);
