import { supabase } from '@/lib/supabase'

export interface Branch {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_main: boolean
  opening_hours: Record<string, unknown>
  status: string
  created_at: string
  updated_at: string
}

export async function getBranches(businessId: string): Promise<Branch[]> {
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .order('name')
  return data ?? []
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function createBranch(businessId: string, branch: Partial<Branch>): Promise<void> {
  await supabase
    .from('branches')
    .insert({ business_id: businessId, ...branch })
}

export async function updateBranch(id: string, updates: Partial<Branch>): Promise<void> {
  await supabase.from('branches').update(updates).eq('id', id)
}

export async function deleteBranch(id: string): Promise<void> {
  await supabase.from('branches').delete().eq('id', id)
}
