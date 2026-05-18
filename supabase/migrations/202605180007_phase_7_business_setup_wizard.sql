-- Phase 7: Business setup wizard support.
-- Additive only. Lets owners mark setup complete and choose onboarding modules safely.

alter table public.businesses
  add column if not exists setup_completed_at timestamptz,
  add column if not exists setup_step text,
  add column if not exists setup_metadata jsonb not null default '{}'::jsonb;

create or replace function public.set_business_onboarding_modules(
  target_business_id uuid,
  target_module_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_key text;
begin
  if not (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(target_business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  ) then
    raise exception 'Only the business owner can choose setup modules';
  end if;

  foreach v_module_key in array target_module_keys
  loop
    if v_module_key in ('booking', 'membership', 'pos', 'inventory', 'loyalty', 'reports', 'payment', 'customer_portal', 'core') then
      insert into public.business_module_access (
        business_id,
        module_key,
        access_level,
        is_enabled,
        source,
        limit_config,
        start_date
      )
      values (
        target_business_id,
        v_module_key,
        case when v_module_key = 'core' then 'unlimited' else 'basic' end,
        true,
        'manual',
        '{}'::jsonb,
        current_date
      )
      on conflict (business_id, module_key, source) do update set
        access_level = excluded.access_level,
        is_enabled = true,
        end_date = null,
        updated_at = now();
    end if;
  end loop;
end;
$$;

grant execute on function public.set_business_onboarding_modules(uuid, text[]) to authenticated;

create or replace function public.mark_business_setup_complete(
  target_business_id uuid,
  target_setup_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_super_admin(auth.uid())
    or (
      public.has_business_access(target_business_id)
      and public.user_role(auth.uid()) = 'owner'
    )
  ) then
    raise exception 'Only the business owner can finish setup';
  end if;

  update public.businesses
  set setup_completed_at = coalesce(setup_completed_at, now()),
      setup_step = 'completed',
      setup_metadata = coalesce(setup_metadata, '{}'::jsonb) || coalesce(target_setup_metadata, '{}'::jsonb),
      updated_at = now()
  where id = target_business_id;
end;
$$;

grant execute on function public.mark_business_setup_complete(uuid, jsonb) to authenticated;
