import { supabase } from '@/lib/supabase'

export type PlanType = 'subscription' | 'prepaid_credit' | 'visit_package' | 'vip'
export type MembershipStatus = 'active' | 'expired' | 'frozen' | 'cancelled' | 'pending_payment'
export type UsageType = 'credit' | 'visit' | 'discount' | 'manual_adjustment'

export interface MembershipPlan {
  id: string
  business_id: string
  name: string
  plan_type: PlanType
  description: string | null
  price: number
  duration_days: number
  credit_amount: number
  visit_limit: number | null
  points_bonus: number
  discount_percent: number
  benefits: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  business_id: string
  customer_id: string
  plan_id: string
  status: MembershipStatus
  start_date: string
  end_date: string
  remaining_credit: number
  remaining_visits: number
  auto_renew: boolean
  qr_code: string | null
  created_at: string
  updated_at: string
  membership_plans?: MembershipPlan | MembershipPlan[] | null
  customers?: { id: string; full_name: string; phone: string | null; email: string | null } | { id: string; full_name: string; phone: string | null; email: string | null }[] | null
}

export interface MembershipUsage {
  id: string
  business_id: string
  membership_id: string
  customer_id: string
  booking_id: string | null
  usage_type: UsageType
  amount_used: number
  visits_used: number
  notes: string | null
  created_at: string
  bookings?: { id: string; booking_date: string; services?: { name: string } | { name: string }[] | null } | null
}

export const planTypeLabels: Record<PlanType, string> = {
  subscription: 'Subscription',
  prepaid_credit: 'Prepaid Credit',
  visit_package: 'Visit Package',
  vip: 'VIP',
}

export function getMembershipStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
    case 'expired': return 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200'
    case 'frozen': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'
    case 'pending_payment': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
    default: return 'bg-slate-100 text-slate-800'
  }
}

export async function getPlans(businessId: string): Promise<MembershipPlan[]> {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('business_id', businessId)
    .order('name')

  if (error) throw error
  return (data ?? []) as MembershipPlan[]
}

export async function getPlan(id: string): Promise<MembershipPlan | null> {
  const { data, error } = await supabase.from('membership_plans').select('*').eq('id', id).single()
  if (error) { if (error.code === 'PGRST116') return null; throw error }
  return data as MembershipPlan
}

export async function createPlan(input: Partial<MembershipPlan> & { name: string; plan_type: PlanType; price: number; duration_days: number }): Promise<MembershipPlan> {
  const { data, error } = await supabase.from('membership_plans').insert(input).select('*').single()
  if (error) throw error
  return data as MembershipPlan
}

export async function updatePlan(id: string, input: Partial<MembershipPlan>): Promise<MembershipPlan> {
  const { data, error } = await supabase.from('membership_plans').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data as MembershipPlan
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from('membership_plans').delete().eq('id', id)
  if (error) throw error
}

export async function getMemberships(businessId: string, filters: { status?: MembershipStatus | MembershipStatus[]; customer_id?: string; plan_id?: string; expiring_soon?: boolean } = {}): Promise<Membership[]> {
  let query = supabase
    .from('memberships')
    .select('*,membership_plans(*),customers(full_name,phone,email)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (filters.status) {
    if (Array.isArray(filters.status)) query = query.in('status', filters.status)
    else query = query.eq('status', filters.status)
  }
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id)
  if (filters.plan_id) query = query.eq('plan_id', filters.plan_id)

  const { data, error } = await query
  if (error) throw error
  const memberships = (data ?? []) as Membership[]

  if (filters.expiring_soon) {
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    return memberships.filter((m) => m.end_date <= thirtyDays && m.status === 'active')
  }

  return memberships
}

export async function getMembership(id: string): Promise<Membership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*,membership_plans(*),customers(full_name,phone,email)')
    .eq('id', id)
    .single()

  if (error) { if (error.code === 'PGRST116') return null; throw error }
  return data as Membership
}

export async function assignMembership(input: {
  business_id: string
  customer_id: string
  plan_id: string
  start_date?: string
  status?: MembershipStatus
  auto_renew?: boolean
}): Promise<Membership> {
  const plan = await getPlan(input.plan_id)
  if (!plan) throw new Error('Plan not found')

  const startDate = input.start_date ?? new Date().toISOString().slice(0, 10)
  const endDate = new Date(new Date(startDate).getTime() + plan.duration_days * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('memberships')
    .insert({
      business_id: input.business_id,
      customer_id: input.customer_id,
      plan_id: input.plan_id,
      status: input.status ?? 'active',
      start_date: startDate,
      end_date: endDate,
      remaining_credit: plan.credit_amount,
      remaining_visits: plan.visit_limit ?? 0,
      auto_renew: input.auto_renew ?? false,
      qr_code: `${input.customer_id}-${Date.now()}`,
    })
    .select('*,membership_plans(*),customers(full_name,phone,email)')
    .single()

  if (error) throw error
  return data as Membership
}

export async function updateMembership(id: string, input: Partial<Membership>): Promise<Membership> {
  const { data, error } = await supabase
    .from('memberships')
    .update(input)
    .eq('id', id)
    .select('*,membership_plans(*),customers(full_name,phone,email)')
    .single()

  if (error) throw error
  return data as Membership
}

export async function freezeMembership(id: string): Promise<Membership> {
  return updateMembership(id, { status: 'frozen' as MembershipStatus })
}

export async function cancelMembership(id: string): Promise<Membership> {
  return updateMembership(id, { status: 'cancelled' as MembershipStatus })
}

export async function renewMembership(id: string): Promise<Membership> {
  const { error } = await supabase.rpc('renew_membership', { target_membership_id: id })
  if (error) throw error
  const mem = await getMembership(id)
  if (!mem) throw new Error('Membership not found after renewal')
  return mem
}

export async function getUsage(membershipId: string): Promise<MembershipUsage[]> {
  const { data, error } = await supabase
    .from('membership_usage')
    .select('*,bookings(id,booking_date,services(name))')
    .eq('membership_id', membershipId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MembershipUsage[]
}

export async function recordUsage(input: {
  business_id: string
  membership_id: string
  customer_id: string
  booking_id?: string
  usage_type: UsageType
  amount_used?: number
  visits_used?: number
  notes?: string
}): Promise<MembershipUsage> {
  const { data, error } = await supabase
    .from('membership_usage')
    .insert({
      business_id: input.business_id,
      membership_id: input.membership_id,
      customer_id: input.customer_id,
      booking_id: input.booking_id ?? null,
      usage_type: input.usage_type,
      amount_used: input.amount_used ?? 0,
      visits_used: input.visits_used ?? 0,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  if ((input.visits_used ?? 0) > 0 || (input.amount_used ?? 0) > 0) {
    const { data: mem } = await supabase
      .from('memberships')
      .select('remaining_visits,remaining_credit')
      .eq('id', input.membership_id)
      .single()

    if (mem) {
      await supabase
        .from('memberships')
        .update({
          remaining_visits: Math.max(0, (mem.remaining_visits ?? 0) - (input.visits_used ?? 0)),
          remaining_credit: Math.max(0, (Number(mem.remaining_credit) ?? 0) - Number(input.amount_used ?? 0)),
        })
        .eq('id', input.membership_id)
    }
  }

  return data as MembershipUsage
}

export async function searchCustomers(businessId: string, query: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id,full_name,phone,email')
    .eq('business_id', businessId)
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error) throw error
  return data ?? []
}
