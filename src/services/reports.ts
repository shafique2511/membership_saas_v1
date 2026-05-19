import { supabase } from '@/lib/supabase'

export interface ReportFilter {
  days?: number
  branchId?: string
  staffId?: string
  startDate?: string
  endDate?: string
}

type NamedRow = { id: string; name?: string; full_name?: string }

function getPeriod(filter: ReportFilter = {}) {
  const days = filter.days ?? 30
  const start = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()
  const end = filter.endDate ?? new Date().toISOString()
  return { start, end, startDate: start.slice(0, 10), endDate: end.slice(0, 10) }
}

function sum<T>(rows: T[], pick: (row: T) => unknown): number {
  return rows.reduce((total, row) => total + Number(pick(row) ?? 0), 0)
}

function increment(map: Map<string, number>, key: string, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function namedMap(rows: NamedRow[] | null | undefined): Map<string, string> {
  return new Map((rows ?? []).map((row) => [row.id, row.name ?? row.full_name ?? 'Unknown']))
}

function mapEntries(map: Map<string, number>, keyName: string, valueName = 'count') {
  return Array.from(map.entries()).map(([key, value]) => ({ [keyName]: key, [valueName]: value }))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function getStaffNames(businessId: string): Promise<Map<string, string>> {
  const { data } = await supabase.from('staff').select('id, full_name').eq('business_id', businessId)
  return namedMap(data as NamedRow[])
}

async function getServiceNames(businessId: string): Promise<Map<string, string>> {
  const { data } = await supabase.from('services').select('id, name').eq('business_id', businessId)
  return namedMap(data as NamedRow[])
}

async function getCustomerNames(businessId: string): Promise<Map<string, string>> {
  const { data } = await supabase.from('customers').select('id, full_name').eq('business_id', businessId)
  return namedMap(data as NamedRow[])
}

// -- Sales Report --
export interface SalesReport {
  total_revenue: number
  total_orders: number
  total_refunds: number
  net_revenue: number
  avg_order_value: number
  payment_methods: { method: string; total: number; count: number }[]
  daily: { date: string; revenue: number; orders: number }[]
  top_services: { name: string; revenue: number; count: number }[]
}

export async function getSalesReport(businessId: string, filter: ReportFilter = {}): Promise<SalesReport> {
  const period = getPeriod(filter)

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_method, amount, paid_at, created_at, status')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', period.start)
    .lte('paid_at', period.end)

  const { data: refunds } = await supabase
    .from('refunds')
    .select('amount, created_at')
    .eq('business_id', businessId)
    .in('status', ['approved', 'completed'])
    .gte('created_at', period.start)
    .lte('created_at', period.end)

  let ordersQuery = supabase
    .from('pos_orders')
    .select('id, total_amount, created_at, branch_id, staff_id')
    .eq('business_id', businessId)
    .eq('order_status', 'completed')
    .gte('created_at', period.start)
    .lte('created_at', period.end)

  if (filter.branchId) ordersQuery = ordersQuery.eq('branch_id', filter.branchId)
  if (filter.staffId) ordersQuery = ordersQuery.eq('staff_id', filter.staffId)

  const { data: orders } = await ordersQuery
  const orderIds = (orders ?? []).map((order) => order.id)
  const { data: orderItems } = orderIds.length
    ? await supabase
        .from('pos_order_items')
        .select('order_id, item_type, item_name, quantity, total_price')
        .in('order_id', orderIds)
    : { data: [] }

  const rows = payments ?? []
  const total_revenue = sum(rows, (row) => row.amount)
  const total_refunds = sum(refunds ?? [], (row) => row.amount)
  const total_orders = (orders ?? []).length

  const methodMap = new Map<string, { total: number; count: number }>()
  const dailyMap = new Map<string, { revenue: number; orders: number }>()
  const serviceMap = new Map<string, { revenue: number; count: number }>()

  for (const payment of rows) {
    const method = payment.payment_method ?? 'unknown'
    const methodEntry = methodMap.get(method) ?? { total: 0, count: 0 }
    methodEntry.total += Number(payment.amount ?? 0)
    methodEntry.count += 1
    methodMap.set(method, methodEntry)

    const day = (payment.paid_at ?? payment.created_at)?.slice(0, 10)
    if (day) {
      const dayEntry = dailyMap.get(day) ?? { revenue: 0, orders: 0 }
      dayEntry.revenue += Number(payment.amount ?? 0)
      dayEntry.orders += 1
      dailyMap.set(day, dayEntry)
    }
  }

  for (const item of orderItems ?? []) {
    if (item.item_type !== 'service') continue
    const entry = serviceMap.get(item.item_name) ?? { revenue: 0, count: 0 }
    entry.revenue += Number(item.total_price ?? 0)
    entry.count += Number(item.quantity ?? 0)
    serviceMap.set(item.item_name, entry)
  }

  return {
    total_revenue,
    total_orders,
    total_refunds,
    net_revenue: total_revenue - total_refunds,
    avg_order_value: total_orders ? total_revenue / total_orders : 0,
    payment_methods: Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v })),
    daily: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    top_services: Array.from(serviceMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  }
}

// -- Booking Report --
export interface BookingReport {
  total: number
  confirmed: number
  completed: number
  cancelled: number
  no_show: number
  by_status: { status: string; count: number }[]
  by_service: { name: string; count: number }[]
  by_staff: { name: string; count: number }[]
  daily: { date: string; count: number }[]
}

export async function getBookingReport(businessId: string, filter: ReportFilter = {}): Promise<BookingReport> {
  const period = getPeriod(filter)

  let query = supabase
    .from('bookings')
    .select('status, staff_id, service_id, booking_date, branch_id')
    .eq('business_id', businessId)
    .gte('booking_date', period.startDate)
    .lte('booking_date', period.endDate)

  if (filter.staffId) query = query.eq('staff_id', filter.staffId)
  if (filter.branchId) query = query.eq('branch_id', filter.branchId)

  const [{ data: bookings }, staffNames, serviceNames] = await Promise.all([
    query,
    getStaffNames(businessId),
    getServiceNames(businessId),
  ])

  const rows = bookings ?? []
  const statusMap = new Map<string, number>()
  const serviceMap = new Map<string, number>()
  const staffMap = new Map<string, number>()
  const dailyMap = new Map<string, number>()

  for (const booking of rows) {
    increment(statusMap, booking.status ?? 'unknown')
    if (booking.service_id) increment(serviceMap, serviceNames.get(booking.service_id) ?? 'Unknown')
    if (booking.staff_id) increment(staffMap, staffNames.get(booking.staff_id) ?? 'Unassigned')
    if (booking.booking_date) increment(dailyMap, booking.booking_date)
  }

  return {
    total: rows.length,
    confirmed: statusMap.get('confirmed') ?? 0,
    completed: statusMap.get('completed') ?? 0,
    cancelled: statusMap.get('cancelled') ?? 0,
    no_show: statusMap.get('no_show') ?? 0,
    by_status: mapEntries(statusMap, 'status') as { status: string; count: number }[],
    by_service: mapEntries(serviceMap, 'name') as { name: string; count: number }[],
    by_staff: mapEntries(staffMap, 'name') as { name: string; count: number }[],
    daily: mapEntries(dailyMap, 'date') as { date: string; count: number }[],
  }
}

// -- No-show Report --
export interface NoShowReport {
  total_no_shows: number
  no_show_rate: number
  by_staff: { name: string; count: number }[]
  recent: { date: string; customer: string; staff: string }[]
}

export async function getNoShowReport(businessId: string, filter: ReportFilter = {}): Promise<NoShowReport> {
  const period = getPeriod(filter)

  let noShowQuery = supabase
    .from('bookings')
    .select('booking_date, customer_id, staff_id, branch_id')
    .eq('business_id', businessId)
    .eq('status', 'no_show')
    .gte('booking_date', period.startDate)
    .lte('booking_date', period.endDate)
    .order('booking_date', { ascending: false })

  let totalQuery = supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('booking_date', period.startDate)
    .lte('booking_date', period.endDate)

  if (filter.staffId) {
    noShowQuery = noShowQuery.eq('staff_id', filter.staffId)
    totalQuery = totalQuery.eq('staff_id', filter.staffId)
  }
  if (filter.branchId) {
    noShowQuery = noShowQuery.eq('branch_id', filter.branchId)
    totalQuery = totalQuery.eq('branch_id', filter.branchId)
  }

  const [{ data: noShows }, { count: totalBookings }, staffNames, customerNames] = await Promise.all([
    noShowQuery,
    totalQuery,
    getStaffNames(businessId),
    getCustomerNames(businessId),
  ])

  const rows = noShows ?? []
  const staffMap = new Map<string, number>()

  for (const booking of rows) {
    if (booking.staff_id) increment(staffMap, staffNames.get(booking.staff_id) ?? 'Unassigned')
  }

  return {
    total_no_shows: rows.length,
    no_show_rate: totalBookings ? (rows.length / totalBookings) * 100 : 0,
    by_staff: mapEntries(staffMap, 'name') as { name: string; count: number }[],
    recent: rows.slice(0, 20).map((booking) => ({
      date: booking.booking_date,
      customer: booking.customer_id ? customerNames.get(booking.customer_id) ?? 'Unknown' : 'Walk-in',
      staff: booking.staff_id ? staffNames.get(booking.staff_id) ?? 'Unassigned' : 'Unassigned',
    })),
  }
}

// -- Membership Report --
export interface MembershipReport {
  total_members: number
  active_members: number
  expired_members: number
  by_plan: { plan_name: string; count: number }[]
  renewals_this_month: number
  expiring_soon: number
}

export async function getMembershipReport(businessId: string, _filter: ReportFilter = {}): Promise<MembershipReport> {
  const [{ data: memberships }, { data: plans }] = await Promise.all([
    supabase.from('memberships').select('status, plan_id, end_date, created_at').eq('business_id', businessId),
    supabase.from('membership_plans').select('id, name').eq('business_id', businessId),
  ])

  const rows = memberships ?? []
  const planNames = namedMap(plans as NamedRow[])
  const planMap = new Map<string, number>()
  let active = 0
  let expired = 0
  let expiringSoon = 0
  const now = new Date()
  const nextMonth = new Date(now.getTime() + 30 * 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  for (const membership of rows) {
    const planName = planNames.get(membership.plan_id) ?? 'Unknown'
    increment(planMap, planName)
    if (membership.status === 'active') active += 1
    if (membership.status === 'expired') expired += 1
    if (membership.end_date && new Date(membership.end_date) > now && new Date(membership.end_date) < nextMonth) {
      expiringSoon += 1
    }
  }

  return {
    total_members: rows.length,
    active_members: active,
    expired_members: expired,
    by_plan: mapEntries(planMap, 'plan_name') as { plan_name: string; count: number }[],
    renewals_this_month: rows.filter((membership) => membership.created_at >= monthStart).length,
    expiring_soon: expiringSoon,
  }
}

// -- Customer Report --
export interface CustomerReport {
  total_customers: number
  new_this_period: number
  active_this_period: number
  returning_customers: number
  retention_rate: number
  by_join_date: { date: string; count: number }[]
  top_customers: { name: string; total_spent: number; visit_count: number }[]
}

export async function getCustomerReport(businessId: string, filter: ReportFilter = {}): Promise<CustomerReport> {
  const period = getPeriod(filter)

  const [{ data: customers }, { data: payments }, { data: bookings }] = await Promise.all([
    supabase.from('customers').select('id, full_name, created_at').eq('business_id', businessId),
    supabase
      .from('payments')
      .select('customer_id, amount, status, paid_at')
      .eq('business_id', businessId)
      .eq('status', 'paid')
      .gte('paid_at', period.start)
      .lte('paid_at', period.end),
    supabase
      .from('bookings')
      .select('customer_id')
      .eq('business_id', businessId)
      .gte('booking_date', period.startDate)
      .lte('booking_date', period.endDate),
  ])

  const rows = customers ?? []
  const newThisPeriod = rows.filter((customer) => customer.created_at >= period.start).length
  const customerSpend = new Map<string, { total_spent: number; visit_count: number }>()
  const bookingCount = new Map<string, number>()

  for (const payment of payments ?? []) {
    if (!payment.customer_id) continue
    const entry = customerSpend.get(payment.customer_id) ?? { total_spent: 0, visit_count: 0 }
    entry.total_spent += Number(payment.amount ?? 0)
    customerSpend.set(payment.customer_id, entry)
  }
  for (const booking of bookings ?? []) {
    if (!booking.customer_id) continue
    increment(bookingCount, booking.customer_id)
    const entry = customerSpend.get(booking.customer_id) ?? { total_spent: 0, visit_count: 0 }
    entry.visit_count += 1
    customerSpend.set(booking.customer_id, entry)
  }

  const joinDateMap = new Map<string, number>()
  for (const customer of rows) {
    const day = customer.created_at?.slice(0, 10)
    if (day) increment(joinDateMap, day)
  }

  const customerNames = namedMap(rows as NamedRow[])
  const returningCustomers = Array.from(bookingCount.values()).filter((count) => count > 1).length
  const activeThisPeriod = customerSpend.size

  return {
    total_customers: rows.length,
    new_this_period: newThisPeriod,
    active_this_period: activeThisPeriod,
    returning_customers: returningCustomers,
    retention_rate: activeThisPeriod ? (returningCustomers / activeThisPeriod) * 100 : 0,
    by_join_date: mapEntries(joinDateMap, 'date') as { date: string; count: number }[],
    top_customers: Array.from(customerSpend.entries())
      .map(([customerId, value]) => ({ name: customerNames.get(customerId) ?? 'Unknown', ...value }))
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10),
  }
}

// -- Loyalty Report --
export interface LoyaltyReport {
  total_points_earned: number
  total_points_redeemed: number
  active_members: number
  by_type: { type: string; points: number; count: number }[]
}

export async function getLoyaltyReport(businessId: string, filter: ReportFilter = {}): Promise<LoyaltyReport> {
  const period = getPeriod(filter)

  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('transaction_type, points, customer_id, created_at')
    .eq('business_id', businessId)
    .gte('created_at', period.start)
    .lte('created_at', period.end)

  const rows = transactions ?? []
  let earned = 0
  let redeemed = 0
  const typeMap = new Map<string, { points: number; count: number }>()
  const activeCustomers = new Set<string>()

  for (const transaction of rows) {
    const points = Number(transaction.points ?? 0)
    const type = transaction.transaction_type ?? 'unknown'
    if (type === 'earn' || (type === 'adjust' && points > 0)) earned += points
    if (type === 'redeem' || (type === 'adjust' && points < 0)) redeemed += Math.abs(points)
    if (transaction.customer_id) activeCustomers.add(transaction.customer_id)

    const entry = typeMap.get(type) ?? { points: 0, count: 0 }
    entry.points += points
    entry.count += 1
    typeMap.set(type, entry)
  }

  return {
    total_points_earned: earned,
    total_points_redeemed: redeemed,
    active_members: activeCustomers.size,
    by_type: Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v })),
  }
}

// -- Staff Report --
export interface StaffReport {
  total_staff: number
  active_staff: number
  by_role: { role: string; count: number }[]
  top_by_bookings: { name: string; booking_count: number }[]
  top_by_revenue: { name: string; revenue: number }[]
}

export async function getStaffReport(businessId: string, filter: ReportFilter = {}): Promise<StaffReport> {
  const period = getPeriod(filter)

  let bookingQuery = supabase
    .from('bookings')
    .select('staff_id')
    .eq('business_id', businessId)
    .gte('booking_date', period.startDate)
    .lte('booking_date', period.endDate)
    .in('status', ['completed', 'confirmed'])

  let orderQuery = supabase
    .from('pos_orders')
    .select('staff_id, total_amount, created_at')
    .eq('business_id', businessId)
    .eq('order_status', 'completed')
    .gte('created_at', period.start)
    .lte('created_at', period.end)

  if (filter.branchId) {
    bookingQuery = bookingQuery.eq('branch_id', filter.branchId)
    orderQuery = orderQuery.eq('branch_id', filter.branchId)
  }

  const [{ data: staff }, { data: bookings }, { data: orders }] = await Promise.all([
    supabase.from('staff').select('id, full_name, role, status').eq('business_id', businessId),
    bookingQuery,
    orderQuery,
  ])

  const staffRows = staff ?? []
  const staffNames = namedMap(staffRows as NamedRow[])
  const bookingMap = new Map<string, number>()
  const revenueMap = new Map<string, number>()
  const roleMap = new Map<string, number>()
  let activeStaff = 0

  for (const booking of bookings ?? []) {
    if (booking.staff_id) increment(bookingMap, staffNames.get(booking.staff_id) ?? 'Unassigned')
  }
  for (const order of orders ?? []) {
    if (order.staff_id) increment(revenueMap, staffNames.get(order.staff_id) ?? 'Unassigned', Number(order.total_amount ?? 0))
  }
  for (const staffMember of staffRows) {
    increment(roleMap, staffMember.role ?? 'staff')
    if (staffMember.status === 'active') activeStaff += 1
  }

  return {
    total_staff: staffRows.length,
    active_staff: activeStaff,
    by_role: mapEntries(roleMap, 'role') as { role: string; count: number }[],
    top_by_bookings: Array.from(bookingMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, booking_count]) => ({ name, booking_count })),
    top_by_revenue: Array.from(revenueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, revenue]) => ({ name, revenue })),
  }
}

// -- Inventory Report --
export interface InventoryReport {
  total_products: number
  low_stock_items: number
  out_of_stock: number
  total_stock_value: number
  by_category: { category: string; count: number; value: number }[]
  movements: { date: string; type: string; quantity: number }[]
}

export async function getInventoryReport(businessId: string, filter: ReportFilter = {}): Promise<InventoryReport> {
  const period = getPeriod(filter)

  let productQuery = supabase
    .from('products')
    .select('id, name, category, stock_quantity, selling_price, cost_price, low_stock_threshold, branch_id')
    .eq('business_id', businessId)

  let movementQuery = supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, created_at, branch_id')
    .eq('business_id', businessId)
    .gte('created_at', period.start)
    .lte('created_at', period.end)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filter.branchId) {
    productQuery = productQuery.eq('branch_id', filter.branchId)
    movementQuery = movementQuery.eq('branch_id', filter.branchId)
  }

  const [{ data: products }, { data: transactions }] = await Promise.all([productQuery, movementQuery])

  const rows = products ?? []
  let lowStock = 0
  let outOfStock = 0
  let totalValue = 0
  const categoryMap = new Map<string, { count: number; value: number }>()

  for (const product of rows) {
    const category = product.category ?? 'Uncategorized'
    const value = Number(product.selling_price ?? 0) * Number(product.stock_quantity ?? 0)
    const entry = categoryMap.get(category) ?? { count: 0, value: 0 }
    entry.count += 1
    entry.value += value
    categoryMap.set(category, entry)
    totalValue += value
    if (Number(product.stock_quantity ?? 0) <= Number(product.low_stock_threshold ?? 0)) lowStock += 1
    if (Number(product.stock_quantity ?? 0) === 0) outOfStock += 1
  }

  return {
    total_products: rows.length,
    low_stock_items: lowStock,
    out_of_stock: outOfStock,
    total_stock_value: totalValue,
    by_category: Array.from(categoryMap.entries()).map(([category, v]) => ({ category, ...v })),
    movements: (transactions ?? []).map((transaction) => ({
      date: transaction.created_at,
      type: transaction.transaction_type,
      quantity: Number(transaction.quantity ?? 0),
    })),
  }
}

// -- Payment Report --
export interface PaymentReport {
  total_collected: number
  by_method: { method: string; total: number; count: number }[]
  by_status: { status: string; total: number; count: number }[]
  pending_verification: number
  refunds_this_period: number
}

export async function getPaymentReport(businessId: string, filter: ReportFilter = {}): Promise<PaymentReport> {
  const period = getPeriod(filter)

  const [{ data: payments }, { data: refunds }] = await Promise.all([
    supabase
      .from('payments')
      .select('payment_method, status, amount, created_at')
      .eq('business_id', businessId)
      .gte('created_at', period.start)
      .lte('created_at', period.end),
    supabase
      .from('refunds')
      .select('amount, created_at')
      .eq('business_id', businessId)
      .in('status', ['approved', 'completed'])
      .gte('created_at', period.start)
      .lte('created_at', period.end),
  ])

  const rows = payments ?? []
  const methodMap = new Map<string, { total: number; count: number }>()
  const statusMap = new Map<string, { total: number; count: number }>()
  let pendingVerification = 0

  for (const payment of rows) {
    const method = payment.payment_method ?? 'unknown'
    const methodEntry = methodMap.get(method) ?? { total: 0, count: 0 }
    methodEntry.total += Number(payment.amount ?? 0)
    methodEntry.count += 1
    methodMap.set(method, methodEntry)

    const status = payment.status ?? 'unknown'
    const statusEntry = statusMap.get(status) ?? { total: 0, count: 0 }
    statusEntry.total += Number(payment.amount ?? 0)
    statusEntry.count += 1
    statusMap.set(status, statusEntry)

    if (status === 'pending') pendingVerification += 1
  }

  return {
    total_collected: rows.filter((payment) => payment.status === 'paid').reduce((total, payment) => total + Number(payment.amount ?? 0), 0),
    by_method: Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v })),
    by_status: Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v })),
    pending_verification: pendingVerification,
    refunds_this_period: sum(refunds ?? [], (refund) => refund.amount),
  }
}

// -- Profit Report --
export interface ProfitReport {
  total_revenue: number
  total_refunds: number
  estimated_cogs: number
  gross_profit: number
  profit_margin: number
}

export async function getProfitReport(businessId: string, filter: ReportFilter = {}): Promise<ProfitReport> {
  const sales = await getSalesReport(businessId, filter)
  const period = getPeriod(filter)

  let ordersQuery = supabase
    .from('pos_orders')
    .select('id, branch_id, staff_id, created_at')
    .eq('business_id', businessId)
    .eq('order_status', 'completed')
    .gte('created_at', period.start)
    .lte('created_at', period.end)

  if (filter.branchId) ordersQuery = ordersQuery.eq('branch_id', filter.branchId)
  if (filter.staffId) ordersQuery = ordersQuery.eq('staff_id', filter.staffId)

  const { data: orders } = await ordersQuery
  const orderIds = (orders ?? []).map((order) => order.id)
  const { data: items } = orderIds.length
    ? await supabase.from('pos_order_items').select('item_id, item_type, quantity').in('order_id', orderIds).eq('item_type', 'product')
    : { data: [] }
  const productIds = Array.from(new Set((items ?? []).map((item) => item.item_id).filter(Boolean)))
  const { data: products } = productIds.length
    ? await supabase.from('products').select('id, cost_price').in('id', productIds)
    : { data: [] }

  const productCosts = new Map((products ?? []).map((product) => [product.id, Number(product.cost_price ?? 0)]))
  const estimatedCogs = (items ?? []).reduce((total, item) => total + Number(item.quantity ?? 0) * (productCosts.get(item.item_id) ?? 0), 0)
  const grossProfit = sales.net_revenue - estimatedCogs

  return {
    total_revenue: sales.total_revenue,
    total_refunds: sales.total_refunds,
    estimated_cogs: estimatedCogs,
    gross_profit: grossProfit,
    profit_margin: sales.total_revenue ? (grossProfit / sales.total_revenue) * 100 : 0,
  }
}

// -- Branch Report --
export interface BranchReport {
  total_branches: number
  active_branches: number
  by_branch: { branch_id: string; branch_name: string; bookings: number; revenue: number; orders: number }[]
  forecast_ready: boolean
}

export async function getBranchReport(businessId: string, filter: ReportFilter = {}): Promise<BranchReport> {
  const period = getPeriod(filter)
  const [{ data: branches }, { data: bookings }, { data: orders }] = await Promise.all([
    supabase.from('branches').select('id, name, status').eq('business_id', businessId),
    supabase
      .from('bookings')
      .select('branch_id')
      .eq('business_id', businessId)
      .gte('booking_date', period.startDate)
      .lte('booking_date', period.endDate),
    supabase
      .from('pos_orders')
      .select('branch_id, total_amount')
      .eq('business_id', businessId)
      .eq('order_status', 'completed')
      .gte('created_at', period.start)
      .lte('created_at', period.end),
  ])

  const branchRows = branches ?? []
  const branchMap = new Map(branchRows.map((branch) => [branch.id, {
    branch_id: branch.id,
    branch_name: branch.name,
    bookings: 0,
    revenue: 0,
    orders: 0,
  }]))

  for (const booking of bookings ?? []) {
    const branchId = booking.branch_id ?? 'unassigned'
    const entry = branchMap.get(branchId) ?? { branch_id: branchId, branch_name: 'Unassigned', bookings: 0, revenue: 0, orders: 0 }
    entry.bookings += 1
    branchMap.set(branchId, entry)
  }
  for (const order of orders ?? []) {
    const branchId = order.branch_id ?? 'unassigned'
    const entry = branchMap.get(branchId) ?? { branch_id: branchId, branch_name: 'Unassigned', bookings: 0, revenue: 0, orders: 0 }
    entry.revenue += Number(order.total_amount ?? 0)
    entry.orders += 1
    branchMap.set(branchId, entry)
  }

  return {
    total_branches: branchRows.length,
    active_branches: branchRows.filter((branch) => branch.status === 'active').length,
    by_branch: Array.from(branchMap.values()).sort((a, b) => b.revenue - a.revenue),
    forecast_ready: true,
  }
}

// -- Marketing Report --
export interface MarketingReport {
  total_campaigns: number
  sent_campaigns: number
  scheduled_campaigns: number
  total_reached: number
  total_converted: number
  total_revenue: number
  by_campaign: { name: string; reached: number; converted: number; revenue: number }[]
}

export async function getMarketingReport(businessId: string, filter: ReportFilter = {}): Promise<MarketingReport> {
  const period = getPeriod(filter)
  const [{ data: campaigns }, { data: results }] = await Promise.all([
    supabase
      .from('marketing_campaigns')
      .select('id, name, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', period.start)
      .lte('created_at', period.end),
    supabase.from('campaign_results').select('campaign_id, total_reached, total_converted, total_revenue').eq('business_id', businessId),
  ])

  const campaignRows = campaigns ?? []
  const campaignNames = new Map(campaignRows.map((campaign) => [campaign.id, campaign.name]))
  const resultRows = results ?? []

  return {
    total_campaigns: campaignRows.length,
    sent_campaigns: campaignRows.filter((campaign) => campaign.status === 'sent').length,
    scheduled_campaigns: campaignRows.filter((campaign) => campaign.status === 'scheduled').length,
    total_reached: sum(resultRows, (result) => result.total_reached),
    total_converted: sum(resultRows, (result) => result.total_converted),
    total_revenue: sum(resultRows, (result) => result.total_revenue),
    by_campaign: resultRows
      .map((result) => ({
        name: campaignNames.get(result.campaign_id) ?? 'Unknown',
        reached: Number(result.total_reached ?? 0),
        converted: Number(result.total_converted ?? 0),
        revenue: Number(result.total_revenue ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue),
  }
}

// -- Dashboard Summary --
export interface DashboardSummary {
  revenue_today: number
  revenue_month: number
  bookings_today: number
  bookings_month: number
  active_members: number
  low_stock: number
  pending_verifications: number
  no_show_rate: number
}

export async function getDashboardSummary(businessId: string): Promise<DashboardSummary> {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString()
  const monthStartDate = monthStartStr.slice(0, 10)

  const [
    { data: paymentsToday },
    { data: paymentsMonth },
    { data: bookingsToday },
    { data: bookingsMonth },
    { data: memberships },
    { data: products },
    { data: pending },
    { data: noShows },
  ] = await Promise.all([
    supabase.from('payments').select('amount').eq('business_id', businessId).eq('status', 'paid').gte('paid_at', today),
    supabase.from('payments').select('amount').eq('business_id', businessId).eq('status', 'paid').gte('paid_at', monthStartStr),
    supabase.from('bookings').select('id').eq('business_id', businessId).eq('booking_date', today),
    supabase.from('bookings').select('id').eq('business_id', businessId).gte('booking_date', monthStartDate),
    supabase.from('memberships').select('id').eq('business_id', businessId).eq('status', 'active'),
    supabase.from('products').select('id, stock_quantity, low_stock_threshold').eq('business_id', businessId),
    supabase.from('payments').select('id').eq('business_id', businessId).eq('status', 'pending'),
    supabase.from('bookings').select('id').eq('business_id', businessId).eq('status', 'no_show').gte('booking_date', monthStartDate),
  ])

  return {
    revenue_today: sum(paymentsToday ?? [], (payment) => payment.amount),
    revenue_month: sum(paymentsMonth ?? [], (payment) => payment.amount),
    bookings_today: (bookingsToday ?? []).length,
    bookings_month: (bookingsMonth ?? []).length,
    active_members: (memberships ?? []).length,
    low_stock: (products ?? []).filter((product) => Number(product.stock_quantity ?? 0) <= Number(product.low_stock_threshold ?? 0)).length,
    pending_verifications: (pending ?? []).length,
    no_show_rate: (bookingsMonth ?? []).length ? ((noShows ?? []).length / (bookingsMonth ?? []).length) * 100 : 0,
  }
}

// -- Export Helpers --
export function exportToCsv(filename: string, headers: string[], rows: string[][]): void {
  const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportToExcel(filename: string, headers: string[], rows: string[][]): Promise<void> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Report')
  sheet.addRow(headers)
  rows.forEach((row) => sheet.addRow(row))
  sheet.getRow(1).font = { bold: true }
  sheet.columns.forEach((column) => {
    const values = column.values ?? []
    column.width = Math.max(12, ...values.map((value) => String(value ?? '').length + 2))
  })
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToPdf(filename: string, headers: string[], rows: string[][]): void {
  const safeTitle = escapeHtml(filename)
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>${safeTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h2>${safeTitle}</h2>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
        <script>window.onload = () => window.print()</script>
      </body>
    </html>
  `
  const popup = window.open('', '_blank')
  if (popup) {
    popup.document.write(html)
    popup.document.close()
  }
}
