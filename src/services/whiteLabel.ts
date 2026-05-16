import { supabase } from '@/lib/supabase'

export interface WhiteLabelSettings {
  id: string
  business_id: string
  brand_name: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  custom_domain: string | null
  support_email: string | null
  footer_text: string | null
  hide_platform_branding: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getWhiteLabelSettings(businessId: string): Promise<WhiteLabelSettings | null> {
  const { data } = await supabase.rpc('get_white_label_settings', { p_business_id: businessId })
  return data as WhiteLabelSettings | null
}

export async function upsertWhiteLabelSettings(
  businessId: string,
  settings: {
    brand_name?: string | null
    logo_url?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    custom_domain?: string | null
    support_email?: string | null
    footer_text?: string | null
    hide_platform_branding?: boolean | null
  },
): Promise<WhiteLabelSettings> {
  const { data, error } = await supabase.rpc('upsert_white_label_settings', {
    p_business_id: businessId,
    p_brand_name: settings.brand_name ?? null,
    p_logo_url: settings.logo_url ?? null,
    p_primary_color: settings.primary_color ?? null,
    p_secondary_color: settings.secondary_color ?? null,
    p_custom_domain: settings.custom_domain ?? null,
    p_support_email: settings.support_email ?? null,
    p_footer_text: settings.footer_text ?? null,
    p_hide_platform_branding: settings.hide_platform_branding ?? null,
  })
  if (error) throw error
  return data as WhiteLabelSettings
}
