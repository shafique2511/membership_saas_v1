-- Phase 36: Legal pages
-- Additive editable template legal content. These templates are not legal advice.

create table if not exists public.legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('terms', 'privacy', 'data-ownership', 'refund-policy', 'shutdown-policy', 'acceptable-use')),
  title text not null,
  summary text,
  body text not null,
  is_published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_pages enable row level security;

drop policy if exists "legal pages public read published" on public.legal_pages;
create policy "legal pages public read published"
  on public.legal_pages for select
  to anon, authenticated
  using (is_published = true or public.is_super_admin(auth.uid()));

drop policy if exists "legal pages super admin write" on public.legal_pages;
create policy "legal pages super admin write"
  on public.legal_pages for all
  to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop trigger if exists set_legal_pages_updated_at on public.legal_pages;
create trigger set_legal_pages_updated_at
before update on public.legal_pages
for each row execute function public.set_updated_at();

create index if not exists legal_pages_slug_idx on public.legal_pages(slug);
create index if not exists legal_pages_published_idx on public.legal_pages(is_published);

insert into public.legal_pages (slug, title, summary, body, is_published)
values
  (
    'terms',
    'Terms of Service',
    'Template terms for using Luxantara Members.',
    'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nBy using Luxantara Members, you agree to use the service lawfully and only for your own authorized business operations. You are responsible for the accuracy of business, customer, booking, membership, payment, POS, and staff data entered into the platform.\n\nYou must keep account credentials secure and ensure only authorized users access your workspace. Luxantara Members may update, suspend, or limit access when needed to protect the platform, comply with law, or prevent misuse.\n\nThe service is provided as software for business operations. Availability, features, modules, and package limits may vary by subscription, add-on, or platform configuration.',
    true
  ),
  (
    'privacy',
    'Privacy Policy',
    'Template privacy policy for customer and business data handling.',
    'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nLuxantara Members stores and processes account, business, customer, booking, membership, loyalty, POS, payment, notification, and audit information to provide the service.\n\nBusiness owners are responsible for collecting customer data lawfully and for giving customers appropriate notices about how their data is used. Luxantara Members uses data to operate the platform, secure accounts, provide support, maintain audit history, and improve reliability.\n\nAccess to tenant data is restricted by role, module, and business ownership controls. We do not intentionally expose one business tenant data to another business tenant.',
    true
  ),
  (
    'data-ownership',
    'Data Ownership',
    'Template data ownership notice for business owners.',
    'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nYour business data belongs to you. Luxantara Members only stores and processes your data to provide the service. You can export your business data anytime from Settings -> Data & Backup.\n\nBusiness data may include customers, bookings, memberships, loyalty records, POS orders, payments, products, staff records, reports, notifications, reviews, and audit logs. Platform-owned software, infrastructure, package rules, global configuration, and system operations remain owned by the platform operator.',
    true
  ),
  (
    'refund-policy',
    'Refund Policy',
    'Template refund policy for subscriptions and service charges.',
    'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nSubscription, add-on, setup, and service fees are generally billed according to the selected package or agreement. Refund eligibility may depend on billing cycle, service usage, local consumer law, and any written commercial agreement.\n\nIf you believe a charge was made in error, contact support with your business name, invoice or receipt number, payment date, and reason for the request. Approved refunds may be returned through the original or another reasonable payment method.',
    true
  ),
  (
    'shutdown-policy',
    'Shutdown Policy',
    'Template shutdown policy for service discontinuation.',
    'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nIf Luxantara Members is discontinued, we will make reasonable efforts to notify business owners and provide time to download business data before service closure.\n\nDuring a planned shutdown, the platform may enter export-only mode, limit new signups or purchases, and prioritize backup and download access for business owners. Some emergency, legal, security, or infrastructure situations may require shorter notice or immediate restrictions.',
    true
  ),
  (
    'acceptable-use',
    'Acceptable Use Policy',
    'Template acceptable-use rules for the platform.',
    'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nYou may not use Luxantara Members for unlawful, abusive, deceptive, harmful, or unauthorized activity. You may not attempt to access another tenant data, bypass security controls, overload the service, distribute malware, send unlawful messages, or upload content that violates applicable law.\n\nBusiness owners are responsible for their users, staff, customer communications, imported data, and uploaded files. Luxantara Members may suspend or restrict access when use creates security, legal, operational, or reputational risk.',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  is_published = excluded.is_published,
  updated_at = now()
where public.legal_pages.body is null
   or public.legal_pages.body = '';
