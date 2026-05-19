import { supabase } from '@/lib/supabase'

export interface MarketingCampaign {
  id: string
  business_id: string
  name: string
  campaign_type: string
  audience_filter: Record<string, unknown>
  message: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  promo_code_id: string | null
  segment_id: string | null
  channel: string
  subject: string | null
  created_at: string
  updated_at: string
}

export interface PromoCode {
  id: string
  business_id: string
  code: string
  discount_type: string
  discount_value: number
  usage_limit: number
  used_count: number
  min_purchase: number
  applies_to: string
  applicable_ids: string[]
  member_only: boolean
  start_date: string
  end_date: string
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export interface MarketingTargetOption {
  id: string
  name: string
  type: 'service' | 'product' | 'membership'
}

export interface CustomerSegment {
  id: string
  business_id: string
  name: string
  segment_type: string
  criteria: Record<string, unknown>
  customer_count: number
  last_calculated_at: string | null
  created_at: string
  updated_at: string
}

export interface CampaignResult {
  id: string
  business_id: string
  campaign_id: string
  total_reached: number
  total_opened: number
  total_clicked: number
  total_converted: number
  total_revenue: number
  created_at: string
  updated_at: string
}

const CAMPAIGN_TYPES = ['promo_code', 'discount', 'member_only_promo', 'birthday', 'inactive_customer', 'referral', 'broadcast'] as const
const SEGMENT_TYPES = ['new_customers', 'active_members', 'expiring_members', 'vip_customers', 'inactive_customers', 'birthday_month', 'high_spenders', 'no_show_customers', 'by_service'] as const
const DISCOUNT_TYPES = ['percentage', 'fixed', 'free_item'] as const

// --- Campaigns ---

export async function getCampaigns(businessId: string): Promise<MarketingCampaign[]> {
  const { data } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getCampaignById(id: string): Promise<MarketingCampaign | null> {
  const { data } = await supabase.from('marketing_campaigns').select('*').eq('id', id).single()
  return data
}

export async function createCampaign(businessId: string, campaign: Partial<MarketingCampaign>): Promise<string | null> {
  const { data } = await supabase
    .from('marketing_campaigns')
    .insert({ business_id: businessId, ...campaign })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updateCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<void> {
  await supabase.from('marketing_campaigns').update(updates).eq('id', id)
}

export async function deleteCampaign(id: string): Promise<void> {
  await supabase.from('marketing_campaigns').delete().eq('id', id)
}

// --- Promo Codes ---

export async function getPromoCodes(businessId: string): Promise<PromoCode[]> {
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPromoCodeById(id: string): Promise<PromoCode | null> {
  const { data } = await supabase.from('promo_codes').select('*').eq('id', id).single()
  return data
}

export async function createPromoCode(businessId: string, promo: Partial<PromoCode>): Promise<string | null> {
  const normalizedCode = promo.code?.trim().toUpperCase()
  const { data } = await supabase
    .from('promo_codes')
    .insert({ business_id: businessId, ...promo, code: normalizedCode })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<void> {
  const payload = updates.code ? { ...updates, code: updates.code.trim().toUpperCase() } : updates
  await supabase.from('promo_codes').update(payload).eq('id', id)
}

export async function deletePromoCode(id: string): Promise<void> {
  await supabase.from('promo_codes').delete().eq('id', id)
}

export async function validatePromoCode(
  businessId: string,
  code: string,
  amount: number,
  context: { customerId?: string | null; itemType?: string; itemId?: string | null } = {},
): Promise<{ valid: boolean; discount?: number; message?: string }> {
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('business_id', businessId)
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!data) return { valid: false, message: 'Invalid promo code' }
  if (!data.is_active) return { valid: false, message: 'Promo code is inactive' }
  if (data.usage_limit > 0 && data.used_count >= data.usage_limit) return { valid: false, message: 'Promo code usage limit reached' }
  if (data.member_only && !context.customerId) return { valid: false, message: 'This promo is for members only' }

  const now = new Date().toISOString().slice(0, 10)
  if (now < data.start_date) return { valid: false, message: 'Promo code not yet valid' }
  if (now > data.end_date) return { valid: false, message: 'Promo code has expired' }
  if (data.min_purchase > 0 && amount < Number(data.min_purchase)) return { valid: false, message: `Minimum purchase of ${data.min_purchase} required` }
  if (data.applies_to && data.applies_to !== 'all' && context.itemType && data.applies_to !== context.itemType) {
    return { valid: false, message: `Promo code only applies to ${data.applies_to}s` }
  }
  if (Array.isArray(data.applicable_ids) && data.applicable_ids.length > 0 && context.itemId && !data.applicable_ids.includes(context.itemId)) {
    return { valid: false, message: 'Promo code does not apply to this item' }
  }

  const discount =
    data.discount_type === 'percentage'
      ? amount * (Number(data.discount_value) / 100)
      : data.discount_type === 'fixed'
        ? Number(data.discount_value)
        : null

  if (discount === null) return { valid: false, message: 'Promo code type not applicable' }

  return { valid: true, discount: Math.min(discount, amount) }
}

// --- Customer Segments ---

export async function getSegments(businessId: string): Promise<CustomerSegment[]> {
  const { data } = await supabase
    .from('customer_segments')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createSegment(businessId: string, segment: Partial<CustomerSegment>): Promise<string | null> {
  const { data } = await supabase
    .from('customer_segments')
    .insert({ business_id: businessId, ...segment })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function deleteSegment(id: string): Promise<void> {
  await supabase.from('customer_segments').delete().eq('id', id)
}

export async function calculateSegmentCount(businessId: string, segmentType: string, criteria: Record<string, unknown> = {}): Promise<number> {
  const { data } = await supabase.rpc('calculate_segment_count', {
    p_business_id: businessId,
    p_segment_type: segmentType,
    p_criteria: criteria,
  })
  return data ?? 0
}

export async function getMarketingTargetOptions(businessId: string): Promise<MarketingTargetOption[]> {
  const [services, products, plans] = await Promise.all([
    supabase.from('services').select('id, name').eq('business_id', businessId).eq('is_active', true).order('name'),
    supabase.from('products').select('id, name').eq('business_id', businessId).eq('is_active', true).order('name'),
    supabase.from('membership_plans').select('id, name').eq('business_id', businessId).eq('is_active', true).order('name'),
  ])

  return [
    ...(services.data ?? []).map((item) => ({ id: item.id, name: item.name, type: 'service' as const })),
    ...(products.data ?? []).map((item) => ({ id: item.id, name: item.name, type: 'product' as const })),
    ...(plans.data ?? []).map((item) => ({ id: item.id, name: item.name, type: 'membership' as const })),
  ]
}

export async function recalculateAllSegments(businessId: string): Promise<void> {
  const segments = await getSegments(businessId)
  for (const seg of segments) {
    const count = await calculateSegmentCount(businessId, seg.segment_type, seg.criteria)
    await supabase
      .from('customer_segments')
      .update({ customer_count: count, last_calculated_at: new Date().toISOString() })
      .eq('id', seg.id)
  }
}

// --- Campaign Results ---

export async function getCampaignResults(businessId: string): Promise<(CampaignResult & { campaign_name?: string })[]> {
  const { data } = await supabase
    .from('campaign_results')
    .select('*, campaign:marketing_campaigns(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r) => ({
    ...r,
    campaign_name: (r.campaign as { name?: string })?.name ?? 'Unknown',
  }))
}

export async function upsertCampaignResult(businessId: string, campaignId: string, result: Partial<CampaignResult>): Promise<void> {
  await supabase
    .from('campaign_results')
    .upsert({ business_id: businessId, campaign_id: campaignId, ...result })
    .select()
    .single()
}

// --- Broadcast Send ---

export async function sendCampaign(_businessId: string, campaignId: string): Promise<void> {
  await supabase.from('marketing_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', campaignId)
}

export async function scheduleCampaign(campaignId: string, scheduledAt: string): Promise<void> {
  await supabase.from('marketing_campaigns').update({ status: 'scheduled', scheduled_at: scheduledAt }).eq('id', campaignId)
}

// --- Utils ---

export function generatePromoCode(prefix = 'PROMO'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code}`
}

export { CAMPAIGN_TYPES, SEGMENT_TYPES, DISCOUNT_TYPES }
