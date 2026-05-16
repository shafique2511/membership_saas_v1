-- Luxantara Members - Phase 19: White Label Module
-- Custom business branding settings and RPCs

create table if not exists public.white_label_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade unique,
  brand_name text,
  logo_url text,
  primary_color text not null default '#0f766e',
  secondary_color text not null default '#0d9488',
  custom_domain text,
  support_email text,
  footer_text text,
  hide_platform_branding boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index white_label_settings_business_id_idx on public.white_label_settings(business_id);

alter table public.white_label_settings enable row level security;

create policy "white_label_settings tenant all" on public.white_label_settings for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create trigger set_white_label_settings_updated_at before update on public.white_label_settings
  for each row execute function public.set_updated_at();

create or replace function public.get_white_label_settings(p_business_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select to_jsonb(w.*)
  from public.white_label_settings w
  where w.business_id = p_business_id and w.is_active = true
$$;

create or replace function public.upsert_white_label_settings(
  p_business_id uuid,
  p_brand_name text default null,
  p_logo_url text default null,
  p_primary_color text default null,
  p_secondary_color text default null,
  p_custom_domain text default null,
  p_support_email text default null,
  p_footer_text text default null,
  p_hide_platform_branding boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  insert into public.white_label_settings (
    business_id, brand_name, logo_url, primary_color, secondary_color,
    custom_domain, support_email, footer_text, hide_platform_branding
  ) values (
    p_business_id,
    coalesce(p_brand_name, ''),
    p_logo_url,
    coalesce(p_primary_color, '#0f766e'),
    coalesce(p_secondary_color, '#0d9488'),
    p_custom_domain,
    p_support_email,
    p_footer_text,
    coalesce(p_hide_platform_branding, false)
  )
  on conflict (business_id) do update set
    brand_name = coalesce(p_brand_name, white_label_settings.brand_name),
    logo_url = coalesce(p_logo_url, white_label_settings.logo_url),
    primary_color = coalesce(p_primary_color, white_label_settings.primary_color),
    secondary_color = coalesce(p_secondary_color, white_label_settings.secondary_color),
    custom_domain = coalesce(p_custom_domain, white_label_settings.custom_domain),
    support_email = coalesce(p_support_email, white_label_settings.support_email),
    footer_text = coalesce(p_footer_text, white_label_settings.footer_text),
    hide_platform_branding = coalesce(p_hide_platform_branding, white_label_settings.hide_platform_branding),
    updated_at = now()
  returning to_jsonb(white_label_settings.*) into v_result;

  return v_result;
end;
$$;
