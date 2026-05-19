import { supabase } from '@/lib/supabase'

export interface CrmCustomer {
  id: string
  business_id: string
  branch_id: string | null
  full_name: string
  phone: string | null
  email: string | null
  birthday: string | null
  points_balance: number
  total_spent: number
  visit_count: number
  no_show_count: number
  is_high_risk: boolean
  high_risk_reason: string | null
  high_risk_marked_at: string | null
  no_show_reset_at: string | null
  status: string
  created_at: string
  updated_at: string
  last_visit: string | null
  favorite_service: string | null
  favorite_product: string | null
  lifetime_value: number
  tags: CustomerTag[]
}

export interface CustomerTag {
  id: string
  business_id: string
  customer_id: string
  tag: string
  color: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CrmNote {
  id: string
  business_id: string
  branch_id: string | null
  customer_id: string
  staff_id: string | null
  created_by: string | null
  note_type: string
  title: string | null
  body: string
  is_private: boolean
  follow_up_at: string | null
  created_at: string
  updated_at: string
  staff?: { full_name: string } | { full_name: string }[] | null
  user_profiles?: { full_name: string } | { full_name: string }[] | null
}

export type CrmSegment = 'all' | 'inactive' | 'vip' | 'birthday' | 'high_spender' | 'no_show'

export const defaultCrmTags = [
  { tag: 'VIP', color: '#0f766e' },
  { tag: 'Regular', color: '#2563eb' },
  { tag: 'New Customer', color: '#7c3aed' },
  { tag: 'No Show', color: '#dc2626' },
  { tag: 'Birthday This Month', color: '#db2777' },
  { tag: 'High Spender', color: '#ca8a04' },
  { tag: 'Inactive 30 Days', color: '#64748b' },
]

function getDateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

function isBirthdayThisMonth(birthday: string | null) {
  if (!birthday) return false
  return Number(birthday.slice(5, 7)) === new Date().getMonth() + 1
}

async function enrichCustomers(customers: Omit<CrmCustomer, 'last_visit' | 'favorite_service' | 'favorite_product' | 'lifetime_value' | 'tags'>[]): Promise<CrmCustomer[]> {
  const customerIds = customers.map((customer) => customer.id)
  if (customerIds.length === 0) return []

  const businessId = customers[0]?.business_id
  const [{ data: bookings }, { data: services }, { data: tags }, { data: orders }] = await Promise.all([
    supabase
      .from('bookings')
      .select('customer_id, service_id, booking_date, status')
      .eq('business_id', businessId)
      .in('customer_id', customerIds),
    supabase.from('services').select('id, name').eq('business_id', businessId),
    supabase.from('customer_tags').select('*').eq('business_id', businessId).in('customer_id', customerIds),
    supabase.from('pos_orders').select('id, customer_id').eq('business_id', businessId).in('customer_id', customerIds),
  ])

  const serviceNames = new Map((services ?? []).map((service) => [service.id, service.name]))
  const lastVisit = new Map<string, string>()
  const favoriteServiceCounts = new Map<string, Map<string, number>>()
  const tagsByCustomer = new Map<string, CustomerTag[]>()

  for (const tag of (tags ?? []) as CustomerTag[]) {
    const rows = tagsByCustomer.get(tag.customer_id) ?? []
    rows.push(tag)
    tagsByCustomer.set(tag.customer_id, rows)
  }

  for (const booking of bookings ?? []) {
    if (booking.status === 'completed' && booking.booking_date) {
      const existing = lastVisit.get(booking.customer_id)
      if (!existing || booking.booking_date > existing) lastVisit.set(booking.customer_id, booking.booking_date)
    }
    if (booking.service_id) {
      const customerMap = favoriteServiceCounts.get(booking.customer_id) ?? new Map<string, number>()
      customerMap.set(booking.service_id, (customerMap.get(booking.service_id) ?? 0) + 1)
      favoriteServiceCounts.set(booking.customer_id, customerMap)
    }
  }

  const orderIds = (orders ?? []).map((order) => order.id)
  const orderCustomer = new Map((orders ?? []).map((order) => [order.id, order.customer_id]))
  const { data: items } = orderIds.length
    ? await supabase.from('pos_order_items').select('order_id, item_type, item_name, quantity').in('order_id', orderIds).eq('item_type', 'product')
    : { data: [] }
  const favoriteProductCounts = new Map<string, Map<string, number>>()
  for (const item of items ?? []) {
    const customerId = orderCustomer.get(item.order_id)
    if (!customerId) continue
    const customerMap = favoriteProductCounts.get(customerId) ?? new Map<string, number>()
    customerMap.set(item.item_name, (customerMap.get(item.item_name) ?? 0) + Number(item.quantity ?? 1))
    favoriteProductCounts.set(customerId, customerMap)
  }

  function favoriteFromMap(map: Map<string, number> | undefined, labels?: Map<string, string>) {
    if (!map || map.size === 0) return null
    const [id] = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0]
    return labels?.get(id) ?? id
  }

  return customers.map((customer) => ({
    ...customer,
    last_visit: lastVisit.get(customer.id) ?? null,
    favorite_service: favoriteFromMap(favoriteServiceCounts.get(customer.id), serviceNames),
    favorite_product: favoriteFromMap(favoriteProductCounts.get(customer.id)),
    lifetime_value: Number(customer.total_spent ?? 0),
    tags: tagsByCustomer.get(customer.id) ?? [],
  }))
}

export async function getCrmCustomers(
  businessId: string,
  filters: { segment?: CrmSegment; search?: string; inactiveDays?: number; highSpenderMin?: number } = {},
): Promise<CrmCustomer[]> {
  let query = supabase
    .from('customers')
    .select('id, business_id, branch_id, full_name, phone, email, birthday, points_balance, total_spent, visit_count, no_show_count, is_high_risk, high_risk_reason, high_risk_marked_at, no_show_reset_at, status, created_at, updated_at')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false })
    .limit(250)

  if (filters.search?.trim()) {
    const search = filters.search.trim().replaceAll(',', ' ')
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (filters.segment === 'vip' || filters.segment === 'high_spender') {
    query = query.gte('total_spent', filters.highSpenderMin ?? 1000)
  }
  if (filters.segment === 'no_show') {
    query = query.gt('no_show_count', 0)
  }

  const { data, error } = await query
  if (error) throw error

  let customers = await enrichCustomers((data ?? []) as Omit<CrmCustomer, 'last_visit' | 'favorite_service' | 'favorite_product' | 'lifetime_value' | 'tags'>[])

  if (filters.segment === 'birthday') {
    customers = customers.filter((customer) => isBirthdayThisMonth(customer.birthday))
  }
  if (filters.segment === 'inactive') {
    const cutoff = getDateDaysAgo(filters.inactiveDays ?? 30)
    customers = customers.filter((customer) => !customer.last_visit || customer.last_visit < cutoff)
  }

  return customers
}

export async function getCrmCustomer(customerId: string): Promise<CrmCustomer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, branch_id, full_name, phone, email, birthday, points_balance, total_spent, visit_count, no_show_count, is_high_risk, high_risk_reason, high_risk_marked_at, no_show_reset_at, status, created_at, updated_at')
    .eq('id', customerId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  const [customer] = await enrichCustomers([data as Omit<CrmCustomer, 'last_visit' | 'favorite_service' | 'favorite_product' | 'lifetime_value' | 'tags'>])
  return customer ?? null
}

export async function getCrmNotes(customerId: string): Promise<CrmNote[]> {
  const { data, error } = await supabase
    .from('crm_notes')
    .select('*,staff(full_name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CrmNote[]
}

export async function addCrmNote(input: {
  business_id: string
  branch_id?: string | null
  customer_id: string
  note_type?: string
  title?: string
  body: string
  follow_up_at?: string
}): Promise<void> {
  const { error } = await supabase.from('crm_notes').insert({
    business_id: input.business_id,
    branch_id: input.branch_id ?? null,
    customer_id: input.customer_id,
    note_type: input.note_type ?? 'general',
    title: input.title || null,
    body: input.body,
    follow_up_at: input.follow_up_at || null,
    is_private: true,
  })
  if (error) throw error
}

export async function addCustomerTag(input: { business_id: string; customer_id: string; tag: string; color?: string | null }): Promise<void> {
  const { error } = await supabase.from('customer_tags').insert({
    business_id: input.business_id,
    customer_id: input.customer_id,
    tag: input.tag.trim(),
    color: input.color ?? null,
  })
  if (error) throw error
}

export async function removeCustomerTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('customer_tags').delete().eq('id', tagId)
  if (error) throw error
}

export async function resetCustomerNoShowCount(customerId: string, clearHighRisk = true, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('reset_customer_no_show_count', {
    p_customer_id: customerId,
    p_clear_high_risk: clearHighRisk,
    p_notes: notes ?? 'No-show count reset from CRM.',
  })
  if (error) throw error
}
