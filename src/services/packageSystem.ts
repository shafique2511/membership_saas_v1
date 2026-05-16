import { supabase } from '@/lib/supabase'
import type { ModuleKey, PackageKey } from '@/types'

export interface PackageRow {
  id: string
  name: string
  slug: PackageKey
  description: string | null
  monthly_price: number
  yearly_price: number
  setup_fee: number
  is_active: boolean
  sort_order: number
}

export interface ModuleRow {
  id: string
  module_key: ModuleKey
  module_name: string
  description: string | null
  category: string
  is_core: boolean
  is_active: boolean
  sort_order: number
}

export interface ModuleAccessRow {
  id: string
  business_id: string
  module_key: ModuleKey
  access_level: string
  is_enabled: boolean
  source: string
  start_date: string
  end_date: string | null
  limit_config: Record<string, unknown>
}

export interface UsageCounterRow {
  id: string
  business_id: string
  module_key: ModuleKey
  usage_key: string
  used_count: number
  limit_count: number | null
  period_start: string
  period_end: string
}

export async function getPackages() {
  const { data, error } = await supabase.from('packages').select('*').order('sort_order')

  if (error) {
    throw error
  }

  return data as PackageRow[]
}

export async function getModules() {
  const { data, error } = await supabase.from('modules').select('*').order('sort_order')

  if (error) {
    throw error
  }

  return data as ModuleRow[]
}

export async function getBusinessSubscription(businessId: string) {
  const { data, error } = await supabase
    .from('business_subscriptions')
    .select('*, packages(*)')
    .eq('business_id', businessId)
    .in('status', ['trial', 'active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getBusinessModuleAccess(businessId: string) {
  const { data, error } = await supabase
    .from('business_module_access')
    .select('*')
    .eq('business_id', businessId)
    .order('module_key')

  if (error) {
    throw error
  }

  return data as ModuleAccessRow[]
}

export async function getUsageCounters(businessId: string) {
  const { data, error } = await supabase
    .from('usage_counters')
    .select('*')
    .eq('business_id', businessId)
    .order('period_start', { ascending: false })

  if (error) {
    throw error
  }

  return data as UsageCounterRow[]
}

export async function getAddons(businessId: string) {
  const { data, error } = await supabase
    .from('business_addons')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function applyPackageToBusiness(businessId: string, packageId: string) {
  const { data, error } = await supabase.rpc('apply_business_package', {
    target_business_id: businessId,
    target_package_id: packageId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function setBusinessModuleAccess(input: {
  businessId: string
  moduleKey: ModuleKey
  accessLevel: string
  isEnabled: boolean
  source?: 'manual' | 'addon'
  endDate?: string | null
}) {
  const { data, error } = await supabase
    .from('business_module_access')
    .upsert(
      {
        business_id: input.businessId,
        module_key: input.moduleKey,
        access_level: input.accessLevel,
        is_enabled: input.isEnabled,
        source: input.source ?? 'manual',
        end_date: input.endDate,
      },
      { onConflict: 'business_id,module_key,source' },
    )
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
