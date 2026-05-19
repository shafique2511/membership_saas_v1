alter table public.white_label_settings
  add column if not exists domain_status text not null default 'not_configured'
    check (domain_status in ('not_configured', 'pending_dns', 'pending_ssl', 'verified', 'failed')),
  add column if not exists domain_verified_at timestamptz,
  add column if not exists domain_last_checked_at timestamptz,
  add column if not exists domain_dns_records jsonb not null default '{}'::jsonb,
  add column if not exists reseller_name text,
  add column if not exists reseller_support_email text,
  add column if not exists reseller_footer_text text;

create index if not exists white_label_settings_custom_domain_idx
  on public.white_label_settings (lower(custom_domain))
  where custom_domain is not null and trim(custom_domain) <> '';

drop policy if exists "white_label_settings tenant all" on public.white_label_settings;
create policy "white_label_settings tenant read" on public.white_label_settings
for select to authenticated
using (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'white_label.manage')
);

create policy "white_label_settings tenant write" on public.white_label_settings
for all to authenticated
using (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'white_label.manage')
  and public.business_has_module_access(business_id, 'white_label')
)
with check (
  public.has_business_access(business_id)
  and public.has_staff_permission(business_id, 'white_label.manage')
  and public.business_has_module_access(business_id, 'white_label')
);

create or replace function public.normalize_custom_domain(p_domain text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        lower(trim(coalesce(p_domain, ''))),
        '^https?://',
        ''
      ),
      '/.*$',
      ''
    ),
    ''
  )
$$;

create or replace function public.white_label_domain_dns_records(p_domain text)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when public.normalize_custom_domain(p_domain) is null then '{}'::jsonb
    else jsonb_build_object(
      'type', 'CNAME',
      'host', public.normalize_custom_domain(p_domain),
      'value', 'customer.luxantaramembers.com',
      'status', 'pending_dns',
      'note', 'Point the customer portal domain to the Luxantara Members customer portal host. SSL verification is handled after DNS resolves.'
    )
  end
$$;

create or replace function public.get_white_label_settings(p_business_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when public.business_has_module_access(p_business_id, 'white_label') then (
      select to_jsonb(w.*)
      from public.white_label_settings w
      where w.business_id = p_business_id
        and w.is_active = true
      limit 1
    )
    else null::jsonb
  end
$$;

drop function if exists public.upsert_white_label_settings(uuid, text, text, text, text, text, text, text, boolean);

create or replace function public.upsert_white_label_settings(
  p_business_id uuid,
  p_brand_name text default null,
  p_logo_url text default null,
  p_primary_color text default null,
  p_secondary_color text default null,
  p_custom_domain text default null,
  p_support_email text default null,
  p_footer_text text default null,
  p_hide_platform_branding boolean default null,
  p_reseller_name text default null,
  p_reseller_support_email text default null,
  p_reseller_footer_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_custom_domain text := public.normalize_custom_domain(p_custom_domain);
  v_domain_status text := case when public.normalize_custom_domain(p_custom_domain) is null then 'not_configured' else 'pending_dns' end;
begin
  if not public.business_has_module_access(p_business_id, 'white_label') then
    raise exception 'White Label module is not enabled for this business' using errcode = 'P0001';
  end if;

  if not (
    public.has_business_access(p_business_id)
    and public.has_staff_permission(p_business_id, 'white_label.manage')
  ) then
    raise exception 'Not allowed to manage white label settings' using errcode = 'P0001';
  end if;

  if v_custom_domain is not null and exists (
    select 1
    from public.white_label_settings w
    where lower(w.custom_domain) = v_custom_domain
      and w.business_id <> p_business_id
      and w.is_active = true
  ) then
    raise exception 'Custom domain is already used by another business' using errcode = 'P0001';
  end if;

  insert into public.white_label_settings (
    business_id,
    brand_name,
    logo_url,
    primary_color,
    secondary_color,
    custom_domain,
    support_email,
    footer_text,
    hide_platform_branding,
    domain_status,
    domain_dns_records,
    reseller_name,
    reseller_support_email,
    reseller_footer_text
  ) values (
    p_business_id,
    nullif(trim(coalesce(p_brand_name, '')), ''),
    nullif(trim(coalesce(p_logo_url, '')), ''),
    coalesce(nullif(trim(coalesce(p_primary_color, '')), ''), '#0f766e'),
    coalesce(nullif(trim(coalesce(p_secondary_color, '')), ''), '#0d9488'),
    v_custom_domain,
    nullif(trim(coalesce(p_support_email, '')), ''),
    nullif(trim(coalesce(p_footer_text, '')), ''),
    coalesce(p_hide_platform_branding, false),
    v_domain_status,
    public.white_label_domain_dns_records(v_custom_domain),
    nullif(trim(coalesce(p_reseller_name, '')), ''),
    nullif(trim(coalesce(p_reseller_support_email, '')), ''),
    nullif(trim(coalesce(p_reseller_footer_text, '')), '')
  )
  on conflict (business_id) do update set
    brand_name = excluded.brand_name,
    logo_url = excluded.logo_url,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    custom_domain = excluded.custom_domain,
    support_email = excluded.support_email,
    footer_text = excluded.footer_text,
    hide_platform_branding = excluded.hide_platform_branding,
    domain_status = case
      when white_label_settings.custom_domain is distinct from excluded.custom_domain then excluded.domain_status
      else white_label_settings.domain_status
    end,
    domain_dns_records = excluded.domain_dns_records,
    reseller_name = excluded.reseller_name,
    reseller_support_email = excluded.reseller_support_email,
    reseller_footer_text = excluded.reseller_footer_text,
    is_active = true,
    updated_at = now()
  returning to_jsonb(white_label_settings.*) into v_result;

  insert into public.audit_logs (business_id, user_id, action, table_name, new_data)
  values (
    p_business_id,
    auth.uid(),
    'white_label.settings.upsert',
    'white_label_settings',
    jsonb_build_object('custom_domain', v_custom_domain, 'hide_platform_branding', coalesce(p_hide_platform_branding, false))
  );

  return v_result;
end;
$$;

create or replace function public.get_white_label_domain_config(p_host text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_host text := public.normalize_custom_domain(p_host);
  v_config jsonb;
begin
  if v_host is null then
    return null;
  end if;

  select jsonb_build_object(
    'business_id', b.id,
    'business_slug', b.slug,
    'brand_name', coalesce(w.brand_name, b.name),
    'logo_url', coalesce(w.logo_url, b.logo_url),
    'primary_color', coalesce(w.primary_color, '#0f766e'),
    'secondary_color', coalesce(w.secondary_color, '#0d9488'),
    'custom_domain', w.custom_domain,
    'domain_status', w.domain_status,
    'support_email', w.support_email,
    'footer_text', w.footer_text,
    'hide_platform_branding', w.hide_platform_branding
  )
  into v_config
  from public.white_label_settings w
  join public.businesses b on b.id = w.business_id
  where w.is_active = true
    and b.status = 'active'
    and public.business_has_module_access(w.business_id, 'white_label')
    and lower(w.custom_domain) = v_host
  limit 1;

  if v_config is not null then
    return v_config;
  end if;

  select jsonb_build_object(
    'business_id', b.id,
    'business_slug', b.slug,
    'brand_name', b.name,
    'logo_url', b.logo_url,
    'primary_color', '#0f766e',
    'secondary_color', '#0d9488',
    'custom_domain', null,
    'domain_status', 'subdomain',
    'support_email', b.email,
    'footer_text', null,
    'hide_platform_branding', false
  )
  into v_config
  from public.businesses b
  where b.status = 'active'
    and b.slug = split_part(v_host, '.', 1)
  limit 1;

  return v_config;
end;
$$;

grant execute on function public.normalize_custom_domain(text) to anon, authenticated;
grant execute on function public.white_label_domain_dns_records(text) to authenticated;
grant execute on function public.get_white_label_settings(uuid) to anon, authenticated;
grant execute on function public.upsert_white_label_settings(uuid, text, text, text, text, text, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.get_white_label_domain_config(text) to anon, authenticated;
