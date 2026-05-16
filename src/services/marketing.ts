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
  created_at: string
  updated_at: string
}

export async function getCampaigns(businessId: string): Promise<MarketingCampaign[]> {
  const { data } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getCampaignById(id: string): Promise<MarketingCampaign | null> {
  const { data } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function createCampaign(businessId: string, campaign: Partial<MarketingCampaign>): Promise<void> {
  await supabase
    .from('marketing_campaigns')
    .insert({ business_id: businessId, ...campaign })
}

export async function updateCampaign(id: string, updates: Partial<MarketingCampaign>): Promise<void> {
  await supabase.from('marketing_campaigns').update(updates).eq('id', id)
}

export async function deleteCampaign(id: string): Promise<void> {
  await supabase.from('marketing_campaigns').delete().eq('id', id)
}
