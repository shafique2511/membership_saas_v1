import { supabase } from '@/lib/supabase'

export type LegalPageSlug = 'terms' | 'privacy' | 'data-ownership' | 'refund-policy' | 'shutdown-policy' | 'acceptable-use'

export interface LegalPage {
  id?: string
  slug: LegalPageSlug
  title: string
  summary: string | null
  body: string
  is_published: boolean
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

export const legalPageOrder: LegalPageSlug[] = ['terms', 'privacy', 'data-ownership', 'refund-policy', 'shutdown-policy', 'acceptable-use']

export const fallbackLegalPages: Record<LegalPageSlug, LegalPage> = {
  terms: {
    slug: 'terms',
    title: 'Terms of Service',
    summary: 'Template terms for using Luxantara Members.',
    body: 'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nBy using Luxantara Members, you agree to use the service lawfully and only for authorized business operations. You are responsible for data entered into the platform and for keeping account credentials secure.',
    is_published: true,
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'Template privacy policy for customer and business data handling.',
    body: 'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nLuxantara Members stores and processes account, business, customer, booking, membership, payment, POS, notification, and audit information to provide the service.',
    is_published: true,
  },
  'data-ownership': {
    slug: 'data-ownership',
    title: 'Data Ownership',
    summary: 'Template data ownership notice for business owners.',
    body: 'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nYour business data belongs to you. Luxantara Members only stores and processes your data to provide the service. You can export your business data anytime from Settings -> Data & Backup.',
    is_published: true,
  },
  'refund-policy': {
    slug: 'refund-policy',
    title: 'Refund Policy',
    summary: 'Template refund policy for subscriptions and service charges.',
    body: 'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nRefund eligibility may depend on billing cycle, service usage, local consumer law, and any written commercial agreement. Contact support if you believe a charge was made in error.',
    is_published: true,
  },
  'shutdown-policy': {
    slug: 'shutdown-policy',
    title: 'Shutdown Policy',
    summary: 'Template shutdown policy for service discontinuation.',
    body: 'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nIf Luxantara Members is discontinued, we will make reasonable efforts to notify business owners and provide time to download business data before service closure.',
    is_published: true,
  },
  'acceptable-use': {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    summary: 'Template acceptable-use rules for the platform.',
    body: 'Important notice: This is a template legal page and not final legal advice. Please review with qualified legal counsel before relying on it.\n\nYou may not use Luxantara Members for unlawful, abusive, deceptive, harmful, or unauthorized activity, or to access another tenant data.',
    is_published: true,
  },
}

export async function getLegalPage(slug: LegalPageSlug): Promise<LegalPage> {
  const { data, error } = await supabase
    .from('legal_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    return fallbackLegalPages[slug]
  }

  return data as LegalPage
}

export async function listLegalPages(): Promise<LegalPage[]> {
  const { data, error } = await supabase
    .from('legal_pages')
    .select('*')
    .order('slug')

  if (error) {
    return legalPageOrder.map((slug) => fallbackLegalPages[slug])
  }

  const pageMap = new Map((data ?? []).map((page) => [page.slug as LegalPageSlug, page as LegalPage]))
  return legalPageOrder.map((slug) => pageMap.get(slug) ?? fallbackLegalPages[slug])
}

export async function saveLegalPage(page: LegalPage) {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('legal_pages')
    .upsert(
      {
        slug: page.slug,
        title: page.title,
        summary: page.summary,
        body: page.body,
        is_published: page.is_published,
        updated_by: userData.user?.id ?? null,
      },
      { onConflict: 'slug' },
    )
    .select('*')
    .single()

  if (error) throw error
  return data as LegalPage
}
