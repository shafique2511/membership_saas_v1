import { supabase } from '@/lib/supabase'
import type { ModuleKey } from '@/types'

export interface BusinessRow {
  id: string
  name: string
  business_type: string
  email: string | null
  phone: string | null
  status: string
  created_at: string
}

export interface AdminStats {
  totalBusinesses: number
  activeBusinesses: number
  trialBusinesses: number
  cancelledBusinesses: number
  monthlyRecurringRevenue: number
  yearlyRecurringRevenue: number
  totalBookings: number
  totalCustomers: number
  totalMembers: number
  revenueByPackage: Record<string, number>
  moduleAdoption: Record<string, number>
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    businessesResult,
    subscriptionsResult,
    bookingsResult,
    customersResult,
    membershipsResult,
    modulesResult,
  ] = await Promise.all([
    supabase.from('businesses').select('id,status', { count: 'exact', head: false }),
    supabase.from('business_subscriptions').select('status,business_id,packages(name,monthly_price,yearly_price)'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('memberships').select('id', { count: 'exact', head: true }),
    supabase.from('business_module_access').select('module_key,business_id,is_enabled'),
  ])

  if (businessesResult.error) throw businessesResult.error
  if (subscriptionsResult.error) throw subscriptionsResult.error
  if (bookingsResult.error) throw bookingsResult.error
  if (customersResult.error) throw customersResult.error
  if (membershipsResult.error) throw membershipsResult.error
  if (modulesResult.error) throw modulesResult.error

  const businesses = businessesResult.data ?? []
  const subscriptions = subscriptionsResult.data ?? []
  const activeSubscriptions = subscriptions.filter((item) => ['trial', 'active', 'past_due'].includes(String(item.status)))
  const revenueByPackage: Record<string, number> = {}

  let monthlyRecurringRevenue = 0
  let yearlyRecurringRevenue = 0

  activeSubscriptions.forEach((item) => {
    const packageData = Array.isArray(item.packages) ? item.packages[0] : item.packages
    const packageName = packageData?.name ?? 'Unknown'
    const monthlyPrice = Number(packageData?.monthly_price ?? 0)
    const yearlyPrice = Number(packageData?.yearly_price ?? 0)

    monthlyRecurringRevenue += monthlyPrice
    yearlyRecurringRevenue += yearlyPrice
    revenueByPackage[packageName] = (revenueByPackage[packageName] ?? 0) + monthlyPrice
  })

  const moduleBusinesses: Record<string, Set<string>> = {}
  ;(modulesResult.data ?? []).forEach((item) => {
    if (!item.is_enabled) return
    const key = String(item.module_key)
    moduleBusinesses[key] ??= new Set<string>()
    moduleBusinesses[key].add(String(item.business_id))
  })

  const totalBusinesses = businesses.length
  const moduleAdoption = Object.fromEntries(
    Object.entries(moduleBusinesses).map(([key, businessIds]) => [
      key,
      totalBusinesses ? Math.round((businessIds.size / totalBusinesses) * 100) : 0,
    ]),
  )

  return {
    totalBusinesses,
    activeBusinesses: businesses.filter((item) => item.status === 'active').length,
    trialBusinesses: subscriptions.filter((item) => item.status === 'trial').length,
    cancelledBusinesses: subscriptions.filter((item) => item.status === 'cancelled').length,
    monthlyRecurringRevenue,
    yearlyRecurringRevenue,
    totalBookings: bookingsResult.count ?? 0,
    totalCustomers: customersResult.count ?? 0,
    totalMembers: membershipsResult.count ?? 0,
    revenueByPackage,
    moduleAdoption,
  }
}

export async function listBusinesses() {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as BusinessRow[]
}

export async function getBusinessDetails(businessId: string) {
  const [business, users, subscription, modules, usage, invoices] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase.from('user_profiles').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase
      .from('business_subscriptions')
      .select('*,packages(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    supabase.from('business_module_access').select('*').eq('business_id', businessId).order('module_key'),
    supabase.from('usage_counters').select('*').eq('business_id', businessId).order('period_start', { ascending: false }),
    supabase.from('billing_invoices').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
  ])

  if (business.error) throw business.error
  if (users.error) throw users.error
  if (subscription.error) throw subscription.error
  if (modules.error) throw modules.error
  if (usage.error) throw usage.error
  if (invoices.error) throw invoices.error

  return {
    business: business.data,
    users: users.data ?? [],
    subscriptions: subscription.data ?? [],
    modules: modules.data ?? [],
    usage: usage.data ?? [],
    invoices: invoices.data ?? [],
  }
}

export async function createBusiness(input: {
  name: string
  business_type: string
  email?: string
  phone?: string
}) {
  const { data, error } = await supabase.from('businesses').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateBusiness(
  businessId: string,
  input: Partial<Pick<BusinessRow, 'name' | 'business_type' | 'email' | 'phone' | 'status'>>,
) {
  const { data, error } = await supabase.from('businesses').update(input).eq('id', businessId).select('*').single()
  if (error) throw error
  return data
}

export function suspendBusiness(businessId: string) {
  return updateBusiness(businessId, { status: 'suspended' })
}

export function activateBusiness(businessId: string) {
  return updateBusiness(businessId, { status: 'active' })
}

export async function listSubscriptions() {
  const { data, error } = await supabase
    .from('business_subscriptions')
    .select('*,businesses(name),packages(name,slug)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function updateSubscription(subscriptionId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('business_subscriptions')
    .update(input)
    .eq('id', subscriptionId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function listPlatformRows(tableName: 'business_addons' | 'billing_invoices' | 'payments' | 'usage_counters' | 'audit_logs') {
  const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createPackage(input: Record<string, unknown>) {
  const { data, error } = await supabase.from('packages').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updatePackage(packageId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from('packages').update(input).eq('id', packageId).select('*').single()
  if (error) throw error
  return data
}

export async function deletePackage(packageId: string) {
  const { error } = await supabase.from('packages').delete().eq('id', packageId)
  if (error) throw error
}

export async function createModule(input: Record<string, unknown>) {
  const { data, error } = await supabase.from('modules').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateModule(moduleId: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from('modules').update(input).eq('id', moduleId).select('*').single()
  if (error) throw error
  return data
}

export async function overrideModuleAccess(input: {
  business_id: string
  module_key: ModuleKey
  access_level: string
  is_enabled: boolean
  end_date?: string | null
}) {
  const { data, error } = await supabase
    .from('business_module_access')
    .upsert(
      {
        business_id: input.business_id,
        module_key: input.module_key,
        access_level: input.access_level,
        is_enabled: input.is_enabled,
        source: 'manual',
        end_date: input.end_date,
      },
      { onConflict: 'business_id,module_key,source' },
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function createPaidAddon(input: {
  business_id: string
  module_key: ModuleKey
  name: string
  access_level: string
  price: number
  end_date?: string | null
}) {
  const { data, error } = await supabase.from('business_addons').insert(input).select('*').single()
  if (error) throw error

  await overrideModuleAccess({
    business_id: input.business_id,
    module_key: input.module_key,
    access_level: input.access_level,
    is_enabled: true,
    end_date: input.end_date,
  })

  return data
}
