import { supabase } from '@/lib/supabase'

export interface ReportFilter {
  days?: number
  branchId?: string
  staffId?: string
  startDate?: string
  endDate?: string
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', since)

  const { data: refunds } = await supabase
    .from('refunds')
    .select('amount')
    .eq('business_id', businessId)
    .in('status', ['approved', 'completed'])
    .gte('created_at', since)

  const { data: orders } = await supabase
    .from('pos_orders')
    .select('total, created_at')
    .eq('business_id', businessId)
    .eq('order_status', 'completed')
    .gte('created_at', since)

  const rows = payments ?? []
  const total_revenue = rows.reduce((s, r) => s + Number(r.amount), 0)
  const total_refunds = (refunds ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const total_orders = (orders ?? []).length

  const methodMap = new Map<string, { total: number; count: number }>()
  const dailyMap = new Map<string, { revenue: number; orders: number }>()

  for (const r of rows) {
    const m = methodMap.get(r.payment_method) ?? { total: 0, count: 0 }
    m.total += Number(r.amount)
    m.count++
    methodMap.set(r.payment_method, m)
    if (r.paid_at) {
      const day = r.paid_at.slice(0, 10)
      const d = dailyMap.get(day) ?? { revenue: 0, orders: 0 }
      d.revenue += Number(r.amount)
      d.orders++
      dailyMap.set(day, d)
    }
  }

  return {
    total_revenue,
    total_orders,
    total_refunds,
    net_revenue: total_revenue - total_refunds,
    avg_order_value: total_orders ? total_revenue / total_orders : 0,
    payment_methods: Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v })),
    daily: Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    top_services: [],
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  let query = supabase
    .from('bookings')
    .select('status, staff_id, services(name)')
    .eq('business_id', businessId)
    .gte('created_at', since)

  if (filter.staffId) query = query.eq('staff_id', filter.staffId)
  if (filter.branchId) query = query.eq('branch_id', filter.branchId)

  const { data: bookings } = await query

  const rows = bookings ?? []
  const statusMap = new Map<string, number>()
  const serviceMap = new Map<string, number>()
  const staffMap = new Map<string, number>()

  for (const b of rows) {
    statusMap.set(b.status, (statusMap.get(b.status) ?? 0) + 1)
    if (b.staff_id) staffMap.set(b.staff_id, (staffMap.get(b.staff_id) ?? 0) + 1)
  }

  return {
    total: rows.length,
    confirmed: statusMap.get('confirmed') ?? 0,
    completed: statusMap.get('completed') ?? 0,
    cancelled: statusMap.get('cancelled') ?? 0,
    no_show: statusMap.get('no_show') ?? 0,
    by_status: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    by_service: Array.from(serviceMap.entries()).map(([name, count]) => ({ name, count })),
    by_staff: Array.from(staffMap.entries()).map(([name, count]) => ({ name, count })),
    daily: [],
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: noShows } = await supabase
    .from('bookings')
    .select('created_at, customer_id, staff_id')
    .eq('business_id', businessId)
    .eq('status', 'no_show')
    .gte('created_at', since)

  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', since)

  const rows = noShows ?? []
  const staffMap = new Map<string, number>()

  for (const b of rows) {
    if (b.staff_id) staffMap.set(b.staff_id, (staffMap.get(b.staff_id) ?? 0) + 1)
  }

  return {
    total_no_shows: rows.length,
    no_show_rate: totalBookings ? rows.length / totalBookings * 100 : 0,
    by_staff: Array.from(staffMap.entries()).map(([name, count]) => ({ name, count })),
    recent: rows.slice(0, 20).map((b) => ({ date: b.created_at, customer: b.customer_id ?? '', staff: b.staff_id ?? '' })),
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
  const { data: memberships } = await supabase
    .from('memberships')
    .select('status, plan:membership_plans!inner(name), expiry_date')
    .eq('business_id', businessId)

  const rows = memberships ?? []
  const planMap = new Map<string, number>()
  let active = 0, expired = 0, expiringSoon = 0
  const now = new Date()
  const nextMonth = new Date(now.getTime() + 30 * 86400000)

  for (const m of rows) {
    const planName = (m.plan as { name?: string })?.name ?? 'Unknown'
    planMap.set(planName, (planMap.get(planName) ?? 0) + 1)
    if (m.status === 'active') active++
    if (m.status === 'expired') expired++
    if (m.expiry_date && new Date(m.expiry_date) > now && new Date(m.expiry_date) < nextMonth) expiringSoon++
  }

  return {
    total_members: rows.length,
    active_members: active,
    expired_members: expired,
    by_plan: Array.from(planMap.entries()).map(([plan_name, count]) => ({ plan_name, count })),
    renewals_this_month: 0,
    expiring_soon: expiringSoon,
  }
}

// -- Customer Report --
export interface CustomerReport {
  total_customers: number
  new_this_period: number
  active_this_period: number
  by_join_date: { date: string; count: number }[]
  top_customers: { name: string; total_spent: number; visit_count: number }[]
}

export async function getCustomerReport(businessId: string, filter: ReportFilter = {}): Promise<CustomerReport> {
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, full_name, created_at')
    .eq('business_id', businessId)

  const { data: payments } = await supabase
    .from('payments')
    .select('customer_id, amount')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', since)

  const rows = customers ?? []
  const newThisPeriod = rows.filter((c) => c.created_at >= since).length

  const customerSpend = new Map<string, number>()
  for (const p of payments ?? []) {
    if (p.customer_id) {
      customerSpend.set(p.customer_id, (customerSpend.get(p.customer_id) ?? 0) + Number(p.amount))
    }
  }
  const activeThisPeriod = customerSpend.size

  const joinDateMap = new Map<string, number>()
  for (const c of rows) {
    const day = c.created_at?.slice(0, 10)
    if (day) joinDateMap.set(day, (joinDateMap.get(day) ?? 0) + 1)
  }

  return {
    total_customers: rows.length,
    new_this_period: newThisPeriod,
    active_this_period: activeThisPeriod,
    by_join_date: Array.from(joinDateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    top_customers: [],
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('type, points')
    .eq('business_id', businessId)
    .gte('created_at', since)

  const rows = transactions ?? []
  let earned = 0, redeemed = 0
  const typeMap = new Map<string, { points: number; count: number }>()

  for (const t of rows) {
    const pts = Number(t.points)
    if (t.type === 'earned' || t.type === 'bonus' || t.type === 'birthday' || t.type === 'referral') {
      earned += pts
    } else if (t.type === 'redeemed') {
      redeemed += Math.abs(pts)
    }
    const entry = typeMap.get(t.type) ?? { points: 0, count: 0 }
    entry.points += pts
    entry.count++
    typeMap.set(t.type, entry)
  }

  return {
    total_points_earned: earned,
    total_points_redeemed: redeemed,
    active_members: 0,
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, full_name, role, status')
    .eq('business_id', businessId)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('staff_id')
    .eq('business_id', businessId)
    .gte('created_at', since)
    .in('status', ['completed', 'confirmed'])

  const rows = staff ?? []
  const bookingMap = new Map<string, number>()
  for (const b of bookings ?? []) {
    if (b.staff_id) bookingMap.set(b.staff_id, (bookingMap.get(b.staff_id) ?? 0) + 1)
  }

  const roleMap = new Map<string, number>()
  let activeStaff = 0
  for (const s of rows) {
    roleMap.set(s.role, (roleMap.get(s.role) ?? 0) + 1)
    if (s.status === 'active') activeStaff++
  }

  return {
    total_staff: rows.length,
    active_staff: activeStaff,
    by_role: Array.from(roleMap.entries()).map(([role, count]) => ({ role, count })),
    top_by_bookings: Array.from(bookingMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, booking_count]) => ({ name, booking_count })),
    top_by_revenue: [],
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, stock_quantity, price, reorder_level')
    .eq('business_id', businessId)

  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select('type, quantity, created_at')
    .eq('business_id', businessId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = products ?? []
  let lowStock = 0, outOfStock = 0, totalValue = 0
  const categoryMap = new Map<string, { count: number; value: number }>()

  for (const p of rows) {
    const cat = p.category ?? 'Uncategorized'
    const entry = categoryMap.get(cat) ?? { count: 0, value: 0 }
    entry.count++
    entry.value += Number(p.price ?? 0) * Number(p.stock_quantity ?? 0)
    categoryMap.set(cat, entry)
    totalValue += Number(p.price ?? 0) * Number(p.stock_quantity ?? 0)
    if (p.reorder_level && Number(p.stock_quantity) <= Number(p.reorder_level)) lowStock++
    if (Number(p.stock_quantity) === 0) outOfStock++
  }

  return {
    total_products: rows.length,
    low_stock_items: lowStock,
    out_of_stock: outOfStock,
    total_stock_value: totalValue,
    by_category: Array.from(categoryMap.entries()).map(([category, v]) => ({ category, ...v })),
    movements: (transactions ?? []).map((t) => ({ date: t.created_at, type: t.type, quantity: Number(t.quantity) })),
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
  const days = filter.days ?? 30
  const since = filter.startDate ?? new Date(Date.now() - days * 86400000).toISOString()

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_method, status, amount')
    .eq('business_id', businessId)
    .gte('created_at', since)

  const { data: refunds } = await supabase
    .from('refunds')
    .select('amount')
    .eq('business_id', businessId)
    .in('status', ['approved', 'completed'])
    .gte('created_at', since)

  const rows = payments ?? []
  const methodMap = new Map<string, { total: number; count: number }>()
  const statusMap = new Map<string, { total: number; count: number }>()
  let pendingVerification = 0

  for (const p of rows) {
    const m = methodMap.get(p.payment_method) ?? { total: 0, count: 0 }
    m.total += Number(p.amount)
    m.count++
    methodMap.set(p.payment_method, m)

    const s = statusMap.get(p.status) ?? { total: 0, count: 0 }
    s.total += Number(p.amount)
    s.count++
    statusMap.set(p.status, s)

    if (p.status === 'pending') pendingVerification++
  }

  return {
    total_collected: rows.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
    by_method: Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v })),
    by_status: Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v })),
    pending_verification: pendingVerification,
    refunds_this_period: (refunds ?? []).reduce((s, r) => s + Number(r.amount), 0),
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

  const { data: products } = await supabase
    .from('products')
    .select('price, cost_price, stock_quantity')
    .eq('business_id', businessId)

  const estimatedCogs = (products ?? []).reduce(
    (s, p) => s + Number(p.cost_price ?? 0) * Number(p.stock_quantity ?? 0),
    0,
  )

  const grossProfit = sales.net_revenue - estimatedCogs * 0.3

  return {
    total_revenue: sales.total_revenue,
    total_refunds: sales.total_refunds,
    estimated_cogs: estimatedCogs * 0.3,
    gross_profit: grossProfit,
    profit_margin: sales.total_revenue ? (grossProfit / sales.total_revenue) * 100 : 0,
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

  const { data: paymentsToday } = await supabase
    .from('payments')
    .select('amount')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', today)

  const { data: paymentsMonth } = await supabase
    .from('payments')
    .select('amount')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', monthStartStr)

  const { data: bookingsToday } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', businessId)
    .gte('created_at', today)

  const { data: bookingsMonth } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', businessId)
    .gte('created_at', monthStartStr)

  const { data: memberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'active')

  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('business_id', businessId)
    .not('reorder_level', 'is', null)

  const { data: pending } = await supabase
    .from('payments')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'pending')

  const { data: noShows } = await supabase
    .from('bookings')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'no_show')

  return {
    revenue_today: (paymentsToday ?? []).reduce((s, p) => s + Number(p.amount), 0),
    revenue_month: (paymentsMonth ?? []).reduce((s, p) => s + Number(p.amount), 0),
    bookings_today: (bookingsToday ?? []).length,
    bookings_month: (bookingsMonth ?? []).length,
    active_members: (memberships ?? []).length,
    low_stock: (products ?? []).length,
    pending_verifications: (pending ?? []).length,
    no_show_rate: (bookingsMonth ?? []).length
      ? ((noShows ?? []).length / (bookingsMonth ?? []).length) * 100
      : 0,
  }
}

// -- Export Helpers --
export function exportToCsv(filename: string, headers: string[], rows: string[][]): void {
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToExcel(_filename: string, _headers: string[], _rows: string[][]): void {
  exportToCsv(_filename, _headers, _rows)
}

export function exportToPdf(_filename: string, _headers: string[], _rows: string[][]): void {
  const html = `
    <html><head><meta charset="utf-8"><title>${_filename}</title>
    <style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }</style>
    </head><body>
    <h2>${_filename}</h2>
    <table><thead><tr>${_headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${_rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </body></html>
  `
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${_filename}.html`
  a.click()
  URL.revokeObjectURL(url)
}
