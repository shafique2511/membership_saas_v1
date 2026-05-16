import { supabase } from '@/lib/supabase'

export interface POSOrder {
  id: string
  business_id: string
  branch_id: string | null
  customer_id: string | null
  staff_id: string | null
  order_number: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  payment_status: 'unpaid' | 'paid' | 'partial' | 'refunded' | 'failed'
  order_status: 'draft' | 'open' | 'completed' | 'voided' | 'refunded'
  customer_name: string | null
  customer_phone: string | null
  points_earned: number
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface POSOrderItem {
  id: string
  order_id: string
  item_type: 'product' | 'service' | 'membership'
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface POSDiscount {
  id: string
  order_id: string
  discount_type: 'percentage' | 'fixed' | 'membership' | 'points'
  discount_value: number
  discount_amount: number
  description: string | null
}

export interface POSPayment {
  id: string
  business_id: string
  order_id?: string
  customer_id: string | null
  reference_type: string
  reference_id: string | null
  payment_method: string
  amount: number
  status: string
}

export interface DailyClosing {
  id: string
  business_id: string
  branch_id: string | null
  closing_date: string
  opened_at: string | null
  closed_at: string | null
  opening_balance: number
  closing_balance: number
  cash_sales: number
  qr_sales: number
  card_sales: number
  credit_sales: number
  points_sales: number
  total_sales: number
  total_orders: number
  total_discounts: number
  total_refunds: number
  status: 'open' | 'closed'
  notes: string | null
  closed_by: string | null
}

export const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  qr: 'QR (DuitNow)',
  card: 'Card terminal',
  bank_transfer: 'Bank transfer',
  credit: 'Prepaid credit',
  points: 'Points redemption',
}

export async function searchCustomers(businessId: string, query: string) {
  const { data } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, points_balance')
    .eq('business_id', businessId)
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)
  return data ?? []
}

export async function getProducts(businessId: string, branchId?: string) {
  let q = supabase
    .from('products')
    .select('id, name, sku, selling_price, stock_quantity, low_stock_threshold, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')
  if (branchId) q = q.eq('branch_id', branchId)
  const { data } = await q
  return data ?? []
}

export async function getServices(businessId: string) {
  const { data } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getMembershipPlansForPOS(businessId: string) {
  const { data } = await supabase
    .from('membership_plans')
    .select('id, name, plan_type, price, duration_days, credit_amount, visit_limit')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getNextOrderNumber(businessId: string): Promise<string> {
  const { data: last } = await supabase
    .from('pos_orders')
    .select('order_number')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
  const lastNum = last && last.length > 0 ? parseInt(last[0].order_number.replace('POS-', ''), 10) : 0
  return `POS-${String(lastNum + 1).padStart(6, '0')}`
}

export async function createOrder(data: {
  business_id: string
  customer_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  order_number: string
  subtotal: number
  discount_amount?: number
  tax_amount?: number
  total_amount: number
  notes?: string | null
}) {
  const { data: order, error } = await supabase
    .from('pos_orders')
    .insert({
      business_id: data.business_id,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || null,
      customer_phone: data.customer_phone || null,
      order_number: data.order_number,
      subtotal: data.subtotal,
      discount_amount: data.discount_amount ?? 0,
      tax_amount: data.tax_amount ?? 0,
      total_amount: data.total_amount,
      notes: data.notes || null,
      order_status: 'completed',
      payment_status: 'unpaid',
    })
    .select()
    .single()
  if (error) throw error
  return order as POSOrder
}

export async function addOrderItems(orderId: string, items: { item_type: string; item_id?: string | null; item_name: string; quantity: number; unit_price: number; total_price: number }[]) {
  const { error } = await supabase.from('pos_order_items').insert(
    items.map((i) => ({ ...i, order_id: orderId })),
  )
  if (error) throw error
}

export async function recordPayments(businessId: string, orderId: string, customerId: string | null, payments: { payment_method: string; amount: number }[]) {
  const { error } = await supabase.from('payments').insert(
    payments.map((p) => ({
      business_id: businessId,
      customer_id: customerId,
      reference_type: 'pos_order',
      reference_id: orderId,
      payment_method: p.payment_method,
      amount: p.amount,
      status: 'paid',
      paid_at: new Date().toISOString(),
    })),
  )
  if (error) throw error
}

export async function recordDiscounts(orderId: string, discounts: { discount_type: string; discount_value: number; discount_amount: number; description?: string }[]) {
  if (discounts.length === 0) return
  const { error } = await supabase.from('pos_discounts').insert(
    discounts.map((d) => ({ ...d, order_id: orderId })),
  )
  if (error) throw error
}

export async function recordMembershipUsage(orderId: string, usages: { membership_id: string; usage_type: string; amount_used: number; visits_used: number }[]) {
  if (usages.length === 0) return
  const { error } = await supabase.from('pos_membership_usage').insert(
    usages.map((u) => ({ ...u, order_id: orderId })),
  )
  if (error) throw error
}

export async function recordPointsRedemption(orderId: string, customerId: string, points: number, discountAmount: number) {
  const { error } = await supabase.from('pos_points_redemption').insert({
    order_id: orderId,
    customer_id: customerId,
    points_redeemed: points,
    discount_amount: discountAmount,
  })
  if (error) throw error
}

export async function completePOSOrder(orderId: string) {
  const { error } = await supabase.rpc('complete_pos_order', { p_order_id: orderId })
  if (error) throw error
}

export async function updateOrderPaymentStatus(orderId: string, status: string) {
  const { error } = await supabase.from('pos_orders').update({ payment_status: status }).eq('id', orderId)
  if (error) throw error
}

export async function updateOrderPoints(orderId: string, points: number) {
  const { error } = await supabase.from('pos_orders').update({ points_earned: points }).eq('id', orderId)
  if (error) throw error
}

export async function getOrders(businessId: string, filters?: { status?: string; payment_status?: string; date_from?: string; date_to?: string; search?: string }) {
  let q = supabase
    .from('pos_orders')
    .select('*, customers(full_name, phone)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.status && filters.status !== 'all') q = q.eq('order_status', filters.status)
  if (filters?.payment_status && filters.payment_status !== 'all') q = q.eq('payment_status', filters.payment_status)
  if (filters?.date_from) q = q.gte('created_at', filters.date_from)
  if (filters?.date_to) q = q.lte('created_at', filters.date_to + 'T23:59:59')
  if (filters?.search) {
    q = q.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`)
  }

  const { data } = await q
  return data ?? []
}

export async function getOrder(orderId: string) {
  const { data } = await supabase
    .from('pos_orders')
    .select('*, customers(full_name, phone)')
    .eq('id', orderId)
    .single()
  return data
}

export async function getOrderItems(orderId: string) {
  const { data } = await supabase
    .from('pos_order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getOrderPayments(orderId: string) {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('reference_type', 'pos_order')
    .eq('reference_id', orderId)
  return data ?? []
}

export async function getOrderDiscounts(orderId: string) {
  const { data } = await supabase
    .from('pos_discounts')
    .select('*')
    .eq('order_id', orderId)
  return data ?? []
}

export async function refundOrder(orderId: string, reason?: string) {
  const { error } = await supabase.rpc('refund_pos_order', { p_order_id: orderId, p_reason: reason || null })
  if (error) throw error
}

export async function getReceipts(businessId: string) {
  const { data } = await supabase
    .from('pos_receipts')
    .select('*, pos_orders(order_number, total_amount, customer_name, created_at)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export async function createReceipt(data: { business_id: string; order_id: string; receipt_number: string; receipt_data: Record<string, unknown> }) {
  const { error } = await supabase.from('pos_receipts').insert(data)
  if (error) throw error
}

export async function getDailyClosing(businessId: string, date?: string) {
  const d = date ?? new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('business_id', businessId)
    .eq('closing_date', d)
    .single()
  return data
}

export async function openDailyClosing(businessId: string, openingBalance = 0) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('business_id', businessId)
    .eq('closing_date', today)
    .single()
  if (existing) return existing

  const { data, error } = await supabase
    .from('daily_closings')
    .insert({
      business_id: businessId,
      closing_date: today,
      opened_at: new Date().toISOString(),
      opening_balance: openingBalance,
      status: 'open',
    })
    .select()
    .single()
  if (error) throw error
  return data as DailyClosing
}

export async function closeDailyClosing(
  businessId: string,
  data: {
    closing_balance: number
    cash_sales: number
    qr_sales: number
    card_sales: number
    credit_sales: number
    points_sales: number
    total_sales: number
    total_orders: number
    total_discounts: number
    total_refunds: number
    notes?: string
  },
) {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('daily_closings')
    .update({
      ...data,
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .eq('business_id', businessId)
    .eq('closing_date', today)
  if (error) throw error
}

export async function getDailyClosings(businessId: string) {
  const { data } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('business_id', businessId)
    .order('closing_date', { ascending: false })
    .limit(60)
  return data ?? []
}

export async function getTodaySalesSummary(businessId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: orders } = await supabase
    .from('pos_orders')
    .select('total_amount, discount_amount, payment_status, order_status')
    .eq('business_id', businessId)
    .gte('created_at', today)
    .lt('created_at', today + 'T23:59:59')
  const completed = (orders ?? []).filter((o) => o.order_status === 'completed')
  const totalSales = completed.reduce((s, o) => s + Number(o.total_amount), 0)
  const totalDiscounts = completed.reduce((s, o) => s + Number(o.discount_amount), 0)
  const totalRefunds = (orders ?? []).filter((o) => o.order_status === 'refunded').reduce((s, o) => s + Number(o.total_amount), 0)
  const totalOrders = completed.length

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_method, amount')
    .eq('reference_type', 'pos_order')
    .gte('created_at', today)
    .lt('created_at', today + 'T23:59:59')

  const cashSales = (payments ?? []).filter((p) => p.payment_method === 'cash').reduce((s, p) => s + Number(p.amount), 0)
  const qrSales = (payments ?? []).filter((p) => p.payment_method === 'qr').reduce((s, p) => s + Number(p.amount), 0)
  const cardSales = (payments ?? []).filter((p) => p.payment_method === 'card').reduce((s, p) => s + Number(p.amount), 0)
  const creditSales = (payments ?? []).filter((p) => p.payment_method === 'credit').reduce((s, p) => s + Number(p.amount), 0)
  const pointsSales = (payments ?? []).filter((p) => p.payment_method === 'points').reduce((s, p) => s + Number(p.amount), 0)

  return { totalSales, totalDiscounts, totalRefunds, totalOrders, cashSales, qrSales, cardSales, creditSales, pointsSales }
}
