import { supabase } from '@/lib/supabase'
import type { BusinessType } from '@/types'

export interface Business {
  id: string
  slug?: string | null
  name: string
  business_type: BusinessType
  logo_url: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  timezone: string
  status: string
  created_at: string
  updated_at: string
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()
  return data
}

export async function updateBusiness(businessId: string, updates: Partial<Business>): Promise<void> {
  await supabase.from('businesses').update(updates).eq('id', businessId)
}
