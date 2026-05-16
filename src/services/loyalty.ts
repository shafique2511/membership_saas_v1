import { supabase } from '@/lib/supabase'

export interface LoyaltySettings {
  id: string
  business_id: string
  earning_rate: number
  redemption_rate: number
  redemption_discount_amount: number
  birthday_reward_points: number
  referral_reward_points: number
  points_expiry_days: number
  min_redemption_points: number
  auto_award_birthday: boolean
  auto_award_referral: boolean
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  business_id: string
  name: string
  description: string | null
  reward_type: 'voucher' | 'discount' | 'free_service' | 'free_item' | 'birthday' | 'referral'
  points_required: number
  discount_amount: number | null
  discount_percent: number | null
  free_item: string | null
  service_id: string | null
  item_name: string | null
  voucher_code: string | null
  usage_limit: number | null
  times_redeemed: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PointsTransaction {
  id: string
  business_id: string
  customer_id: string
  transaction_type: 'earn' | 'redeem' | 'adjust' | 'expire'
  points: number
  description: string | null
  reference_type: string | null
  reference_id: string | null
  reward_id: string | null
  balance_after: number | null
  created_by: string | null
  created_at: string
}

export interface ReferralReward {
  id: string
  business_id: string
  referrer_customer_id: string
  referred_customer_id: string
  referred_name: string
  points_awarded: number
  status: 'pending' | 'rewarded' | 'expired'
  rewarded_at: string | null
  created_at: string
  updated_at: string
}

export interface BirthdayReward {
  id: string
  business_id: string
  customer_id: string
  reward_year: number
  points_awarded: number
  status: 'pending' | 'awarded' | 'expired'
  awarded_at: string | null
  created_at: string
}

export const rewardTypeLabels: Record<string, string> = {
  voucher: 'Voucher',
  discount: 'Discount',
  free_service: 'Free service',
  free_item: 'Free item',
  birthday: 'Birthday',
  referral: 'Referral',
}

export async function getLoyaltySettings(businessId: string): Promise<LoyaltySettings | null> {
  const { data } = await supabase
    .from('loyalty_settings')
    .select('*')
    .eq('business_id', businessId)
    .single()
  return data
}

export async function upsertLoyaltySettings(
  businessId: string,
  settings: Partial<LoyaltySettings>,
): Promise<void> {
  await supabase
    .from('loyalty_settings')
    .upsert({ business_id: businessId, ...settings })
    .select()
    .single()
}

export async function getRewards(businessId: string): Promise<Reward[]> {
  const { data } = await supabase
    .from('rewards')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createReward(reward: {
  business_id: string
  name: string
  description?: string | null
  reward_type: string
  points_required: number
  discount_amount?: number | null
  discount_percent?: number | null
  free_item?: string | null
  service_id?: string | null
  item_name?: string | null
  voucher_code?: string | null
  usage_limit?: number | null
  is_active?: boolean
}): Promise<void> {
  await supabase.from('rewards').insert(reward)
}

export async function updateReward(id: string, data: Partial<Reward>): Promise<void> {
  await supabase.from('rewards').update(data).eq('id', id)
}

export async function deleteReward(id: string): Promise<void> {
  await supabase.from('rewards').delete().eq('id', id)
}

export async function getCustomerPoints(
  businessId: string,
  filters?: { search?: string },
): Promise<{ id: string; full_name: string; phone: string | null; email: string | null; points_balance: number; lifetime_points: number }[]> {
  let query = supabase
    .from('customers')
    .select('id, full_name, phone, email, points_balance, total_spent')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('points_balance', { ascending: false })

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data } = await query
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    full_name: c.full_name as string,
    phone: c.phone as string | null,
    email: c.email as string | null,
    points_balance: c.points_balance as number,
    lifetime_points: Math.round(Number(c.total_spent ?? 0) / 1),
  }))
}

export async function getPointsHistory(
  businessId: string,
  filters?: { customer_id?: string; transaction_type?: string; limit?: number },
): Promise<(PointsTransaction & { customers?: { full_name: string }[] })[]> {
  let query = supabase
    .from('loyalty_transactions')
    .select('*, customers(full_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id)
  }
  if (filters?.transaction_type) {
    query = query.eq('transaction_type', filters.transaction_type)
  }

  const { data } = await query
  return data ?? []
}

export interface AdjustPointsInput {
  business_id: string
  customer_id: string
  points: number
  description: string
}

export async function adjustPoints(input: AdjustPointsInput): Promise<void> {
  await supabase.rpc('adjust_loyalty_points', {
    p_business_id: input.business_id,
    p_customer_id: input.customer_id,
    p_points: input.points,
    p_description: input.description,
    p_created_by: (await supabase.auth.getUser()).data.user?.id ?? '',
  })
}

export async function getReferralRewards(businessId: string): Promise<(ReferralReward & { referrer?: { full_name: string }; referred?: { full_name: string } })[]> {
  const { data } = await supabase
    .from('referral_rewards')
    .select('*, referrer:referrer_customer_id(full_name), referred:referred_customer_id(full_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createReferralReward(data: {
  business_id: string
  referrer_customer_id: string
  referred_customer_id: string
  referred_name: string
  points_awarded?: number
}): Promise<void> {
  await supabase.from('referral_rewards').insert(data)
}

export async function getBirthdayRewards(businessId: string): Promise<(BirthdayReward & { customers?: { full_name: string; birthday: string }[] })[]> {
  const { data } = await supabase
    .from('birthday_rewards')
    .select('*, customers(full_name, birthday)')
    .eq('business_id', businessId)
    .order('reward_year', { ascending: false })
  return data ?? []
}

export async function awardBirthdayReward(businessId: string, customerId: string): Promise<void> {
  const year = new Date().getFullYear()
  await supabase.rpc('award_birthday_reward', {
    p_business_id: businessId,
    p_customer_id: customerId,
    p_year: year,
  })
}

export async function getUpcomingBirthdays(businessId: string): Promise<{ id: string; full_name: string; birthday: string; phone: string | null }[]> {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()

  const { data } = await supabase
    .from('customers')
    .select('id, full_name, birthday, phone')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .not('birthday', 'is', null)
    .order('birthday')

  if (!data) return []

  return data
    .filter((c) => {
      if (!c.birthday) return false
      const b = new Date(c.birthday)
      const bMonth = b.getMonth() + 1
      const bDay = b.getDate()
      const diff = (bMonth - currentMonth) * 30 + (bDay - currentDay)
      return diff >= 0 && diff <= 30
    })
    .map((c) => ({ id: c.id, full_name: c.full_name, birthday: c.birthday!, phone: c.phone }))
    .slice(0, 20) as { id: string; full_name: string; birthday: string; phone: string | null }[]
}


