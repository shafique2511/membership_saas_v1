-- Luxantara Members - Phase 3 auth profile provisioning

create or replace function public.get_staff_invitation(invitation_token text)
returns table (
  id uuid,
  business_id uuid,
  branch_id uuid,
  email text,
  full_name text,
  role text
)
language sql
security definer
stable
set search_path = public
as $$
  select si.id, si.business_id, si.branch_id, si.email, si.full_name, si.role
  from public.staff_invitations si
  where si.token = invitation_token
    and si.status = 'pending'
    and si.expires_at >= now()
  limit 1
$$;

grant execute on function public.get_staff_invitation(text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  requested_business_id uuid;
  created_business_id uuid;
  invitation record;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'customer');

  if requested_role = 'owner' then
    insert into public.businesses (name, business_type, email)
    values (
      coalesce(new.raw_user_meta_data ->> 'business_name', 'New Business'),
      coalesce(new.raw_user_meta_data ->> 'business_type', 'custom'),
      new.email
    )
    returning id into created_business_id;

    insert into public.user_profiles (id, business_id, full_name, email, phone, role)
    values (
      new.id,
      created_business_id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      new.raw_user_meta_data ->> 'phone',
      'owner'
    );

    insert into public.branches (business_id, name, email, is_main)
    values (created_business_id, 'Main Branch', new.email, true);

    insert into public.business_subscriptions (business_id, package_id, status, billing_cycle, start_date, trial_ends_at)
    select created_business_id, p.id, 'trial', 'monthly', current_date, now() + interval '14 days'
    from public.packages p
    where p.slug = 'starter'
    limit 1;

    insert into public.business_module_access (business_id, module_key, access_level, source, limit_config)
    select created_business_id, m.module_key, pm.access_level, 'package', pm.limit_config
    from public.packages p
    join public.package_modules pm on pm.package_id = p.id
    join public.modules m on m.id = pm.module_id
    where p.slug = 'starter'
      and pm.is_enabled = true;

  elsif requested_role = 'customer' then
    requested_business_id := nullif(new.raw_user_meta_data ->> 'business_id', '')::uuid;

    insert into public.user_profiles (id, business_id, full_name, email, phone, role)
    values (
      new.id,
      requested_business_id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      new.raw_user_meta_data ->> 'phone',
      'customer'
    );

    if requested_business_id is not null then
      insert into public.customers (business_id, user_id, full_name, email, phone)
      values (
        requested_business_id,
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
        new.email,
        new.raw_user_meta_data ->> 'phone'
      );
    end if;

  elsif requested_role in ('manager', 'staff') then
    select *
    into invitation
    from public.get_staff_invitation(new.raw_user_meta_data ->> 'invitation_token')
    limit 1;

    if invitation.id is null then
      raise exception 'Invalid or expired staff invitation';
    end if;

    insert into public.user_profiles (id, business_id, branch_id, full_name, email, phone, role)
    values (
      new.id,
      invitation.business_id,
      invitation.branch_id,
      invitation.full_name,
      new.email,
      new.raw_user_meta_data ->> 'phone',
      invitation.role
    );

    insert into public.staff (business_id, branch_id, user_id, full_name, email, phone, role)
    values (
      invitation.business_id,
      invitation.branch_id,
      new.id,
      invitation.full_name,
      new.email,
      new.raw_user_meta_data ->> 'phone',
      invitation.role
    );

    update public.staff_invitations
    set status = 'accepted', accepted_at = now()
    where id = invitation.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
