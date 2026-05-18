import { supabase } from '@/lib/supabase'

export interface CustomerBooking {
  id: string
  booking_type: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_amount: number
  payment_status: string
  notes: string | null
  created_at: string
  service_name: string | null
  staff_name: string | null
  branch_name: string | null
}

export interface CustomerMembership {
  id: string
  plan_name: string
  plan_type: string
  status: string
  start_date: string
  end_date: string
  remaining_credit: number
  remaining_visits: number
  auto_renew: boolean
  qr_code: string | null
  business_name: string
}

export interface CustomerPayment {
  id: string
  payment_method: string
  amount: number
  status: string
  reference_type: string
  reference_id: string | null
  transaction_id: string | null
  paid_at: string | null
  created_at: string
}

export interface CustomerPoints {
  points_balance: number
  total_earned: number
  total_redeemed: number
  total_expired: number
}

export interface RedeemableReward {
  id: string
  name: string
  description: string | null
  reward_type: string
  points_required: number
  discount_amount: number | null
  discount_percent: number | null
  free_item: string | null
}

export interface PublicBusiness {
  id: string
  slug?: string | null
  name: string
  business_type: string
  logo_url: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  timezone: string
}

export async function getPublicBusiness(businessId: string): Promise<PublicBusiness | null> {
  const { data } = await supabase.rpc('get_public_business', { p_business_id: businessId })
  return data as PublicBusiness | null
}

export async function getPublicBusinessBySlug(businessSlug: string): Promise<PublicBusiness | null> {
  const { data, error } = await supabase.rpc('get_public_business_by_slug', { p_business_slug: businessSlug })
  if (error) throw error
  return data as PublicBusiness | null
}

export async function resolveBusinessSlug(businessSlug: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('resolve_business_slug', { p_business_slug: businessSlug })
  if (error) throw error
  return data as string | null
}

export async function getCustomerBookings(customerId: string): Promise<CustomerBooking[]> {
  const { data } = await supabase.rpc('get_customer_bookings', { p_customer_id: customerId })
  return (data as CustomerBooking[]) ?? []
}

export async function getCustomerMemberships(customerId: string): Promise<CustomerMembership[]> {
  const { data } = await supabase.rpc('get_customer_memberships', { p_customer_id: customerId })
  return (data as CustomerMembership[]) ?? []
}

export async function getCustomerPayments(customerId: string): Promise<CustomerPayment[]> {
  const { data } = await supabase.rpc('get_customer_payments', { p_customer_id: customerId })
  return (data as CustomerPayment[]) ?? []
}

export async function getCustomerPoints(customerId: string): Promise<CustomerPoints | null> {
  const { data } = await supabase.rpc('get_customer_points_balance', { p_customer_id: customerId })
  return data?.[0] as CustomerPoints ?? null
}

export async function getRedeemableRewards(businessId: string): Promise<RedeemableReward[]> {
  const { data } = await supabase.rpc('get_customer_redeemable_rewards', { p_business_id: businessId })
  return (data as RedeemableReward[]) ?? []
}

export async function getCustomerByUserId(userId: string, businessId: string) {
  const { data } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, points_balance, total_spent, visit_count, birthday, gender, status')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .single()
  return data
}

export async function updateCustomerProfile(customerId: string, updates: { full_name?: string; phone?: string; email?: string; birthday?: string; gender?: string }) {
  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
  if (error) throw error
}

export async function getBusinessServices(businessId: string) {
  const { data } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, price, category, is_bookable')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .eq('is_bookable', true)
    .order('name')
  return data ?? []
}

export async function getBusinessMembershipPlans(businessId: string) {
  const { data } = await supabase
    .from('membership_plans')
    .select('id, name, plan_type, description, price, duration_days, credit_amount, visit_limit, points_bonus, discount_percent, benefits')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('price')
  return data ?? []
}

export async function getCustomerUpcomingBooking(customerId: string): Promise<CustomerBooking | null> {
  const bookings = await getCustomerBookings(customerId)
  const now = new Date()
  const upcoming = bookings
    .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
    .find((b) => new Date(`${b.booking_date}T${b.start_time}`) >= now || b.status === 'confirmed')
  return upcoming ?? null
}
