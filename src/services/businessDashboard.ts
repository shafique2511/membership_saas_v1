import { supabase } from '@/lib/supabase'

export interface BookingStats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
}

export interface SalesOverview {
  label: string
  amount: number
}

export interface BookingTrend {
  label: string
  count: number
}

export interface MembershipGrowth {
  label: string
  count: number
}

export interface CustomerRetention {
  newCustomers: number
  returningCustomers: number
  totalActive: number
}

export interface TopService {
  name: string
  count: number
}

export interface TopProduct {
  name: string
  count: number
}

export interface StaffPerformance {
  name: string
  bookingCount: number
}

export interface LowStockItem {
  name: string
  stock: number
  threshold: number
}

export interface UpcomingBooking {
  id: string
  customer: string
  service: string
  time: string
  status: string
}

export interface RecentPayment {
  id: string
  amount: number
  method: string
  status: string
  customer_name: string | null
}

export interface RecentActivity {
  id: string
  action: string
  table_name: string
  created_at: string
}

export interface BusinessDashboardData {
  todayBookings: BookingStats
  todaySales: number
  monthlySales: number
  activeMembers: number
  expiringMemberships: number
  newCustomersThisMonth: number
  returningCustomers: number
  topServices: TopService[]
  topProducts: TopProduct[]
  staffPerformance: StaffPerformance[]
  lowStockAlerts: LowStockItem[]
  upcomingBookings: UpcomingBooking[]
  recentPayments: RecentPayment[]
  recentActivity: RecentActivity[]
  salesOverview: SalesOverview[]
  bookingTrend: BookingTrend[]
  membershipGrowth: MembershipGrowth[]
  customerRetention: CustomerRetention
}

const today = new Date().toISOString().slice(0, 10)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function lastNMonths(n: number): { label: string; start: string; end: string }[] {
  const months: { label: string; start: string; end: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
    const label = d.toLocaleString('en', { month: 'short', year: '2-digit' })
    const start = d.toISOString().slice(0, 10)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
    months.push({ label, start, end })
  }
  return months
}

export async function getBusinessDashboard(businessId: string): Promise<BusinessDashboardData> {
  const enabledModules = await getEnabledModuleKeys(businessId)
  const hasBooking = enabledModules.has('booking')
  const hasPayment = enabledModules.has('payment')
  const hasMembership = enabledModules.has('membership')
  const hasInventory = enabledModules.has('inventory')
  const hasStaff = enabledModules.has('staff_commission')
  const hasPos = enabledModules.has('pos')

  const [
    bookingStats,
    todaySalesResult,
    monthlySalesResult,
    activeMembersResult,
    expiringMembershipsResult,
    newCustomersResult,
    returningCustomersResult,
    topServicesResult,
    topProductsResult,
    staffResult,
    lowStockResult,
    upcomingResult,
    recentPaymentsResult,
    salesOverviewResult,
    bookingTrendResult,
    recentActivityResult,
  ] = await Promise.all([
    hasBooking ? getTodayBookingStats(businessId) : Promise.resolve(null),
    hasPayment ? getTodaySales(businessId) : Promise.resolve(0),
    hasPayment ? getMonthlySales(businessId) : Promise.resolve(0),
    hasMembership ? getActiveMembersCount(businessId) : Promise.resolve(0),
    hasMembership ? getExpiringMemberships(businessId) : Promise.resolve(0),
    getNewCustomersThisMonth(businessId),
    getReturningCustomersCount(businessId),
    hasBooking ? getTopServices(businessId) : Promise.resolve([]),
    hasPos || hasInventory ? getTopProducts(businessId) : Promise.resolve([]),
    hasStaff ? getStaffPerformance(businessId) : Promise.resolve([]),
    hasInventory ? getLowStockAlerts(businessId) : Promise.resolve([]),
    hasBooking ? getUpcomingBookings(businessId) : Promise.resolve([]),
    hasPayment ? getRecentPayments(businessId) : Promise.resolve([]),
    hasPayment ? getSalesOverview(businessId) : Promise.resolve([]),
    hasBooking ? getBookingTrend(businessId) : Promise.resolve([]),
    getRecentActivity(businessId),
  ])

  let membershipGrowth: MembershipGrowth[] = []
  if (hasMembership) {
    membershipGrowth = await getMembershipGrowth(businessId)
  }

  const totalActive = await getActiveCustomersCount(businessId)

  return {
    todayBookings: bookingStats ?? { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 },
    todaySales: todaySalesResult,
    monthlySales: monthlySalesResult,
    activeMembers: activeMembersResult,
    expiringMemberships: expiringMembershipsResult,
    newCustomersThisMonth: newCustomersResult,
    returningCustomers: returningCustomersResult,
    topServices: topServicesResult,
    topProducts: topProductsResult,
    staffPerformance: staffResult,
    lowStockAlerts: lowStockResult,
    upcomingBookings: upcomingResult,
    recentPayments: recentPaymentsResult,
    recentActivity: recentActivityResult,
    salesOverview: salesOverviewResult,
    bookingTrend: bookingTrendResult,
    membershipGrowth,
    customerRetention: {
      newCustomers: newCustomersResult,
      returningCustomers: returningCustomersResult,
      totalActive,
    },
  }
}

async function getEnabledModuleKeys(businessId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('business_module_access')
    .select('module_key')
    .eq('business_id', businessId)
    .eq('is_enabled', true)
    .neq('access_level', 'none')

  const keys = new Set((data ?? []).map((r) => r.module_key))
  keys.add('core')
  return keys
}

async function getTodayBookingStats(businessId: string): Promise<BookingStats> {
  const { data } = await supabase
    .from('bookings')
    .select('status')
    .eq('business_id', businessId)
    .eq('booking_date', today)

  const rows = data ?? []
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
    noShow: rows.filter((r) => r.status === 'no_show').length,
  }
}

async function getTodaySales(businessId: string): Promise<number> {
  const { data } = await supabase
    .from('payments')
    .select('amount')
    .eq('business_id', businessId)
    .gte('created_at', today)
    .in('status', ['verified', 'paid'])

  return (data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
}

async function getMonthlySales(businessId: string): Promise<number> {
  const { data } = await supabase
    .from('payments')
    .select('amount')
    .eq('business_id', businessId)
    .gte('created_at', monthStart)
    .in('status', ['verified', 'paid'])

  return (data ?? []).reduce((sum, r) => sum + Number(r.amount), 0)
}

async function getActiveMembersCount(businessId: string): Promise<number> {
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active')

  return count ?? 0
}

async function getExpiringMemberships(businessId: string): Promise<number> {
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active')
    .gte('end_date', today)
    .lte('end_date', thirtyDaysFromNow)

  return count ?? 0
}

async function getNewCustomersThisMonth(businessId: string): Promise<number> {
  const { count } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('created_at', monthStart)

  return count ?? 0
}

async function getReturningCustomersCount(businessId: string): Promise<number> {
  const { count } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gt('visit_count', 1)

  return count ?? 0
}

async function getActiveCustomersCount(businessId: string): Promise<number> {
  const { count } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active')

  return count ?? 0
}

async function getTopServices(businessId: string): Promise<TopService[]> {
  const { data } = await supabase
    .from('bookings')
    .select('services(name)')
    .eq('business_id', businessId)
    .not('service_id', 'is', null)

  const countMap = new Map<string, number>()
  ;(data ?? []).forEach((row) => {
    const svc = Array.isArray(row.services) ? row.services[0] : row.services
    if (svc?.name) {
      countMap.set(svc.name, (countMap.get(svc.name) ?? 0) + 1)
    }
  })

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
}

async function getTopProducts(businessId: string): Promise<TopProduct[]> {
  const { data: orders } = await supabase
    .from('pos_orders')
    .select('id')
    .eq('business_id', businessId)

  const orderIds = (orders ?? []).map((o) => o.id)
  if (!orderIds.length) return []

  const { data } = await supabase
    .from('pos_order_items')
    .select('item_name,quantity')
    .eq('item_type', 'product')
    .in('order_id', orderIds)

  const countMap = new Map<string, number>()
  ;(data ?? []).forEach((row) => {
    countMap.set(row.item_name, (countMap.get(row.item_name) ?? 0) + Number(row.quantity))
  })

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
}

async function getStaffPerformance(businessId: string): Promise<StaffPerformance[]> {
  const { data } = await supabase
    .from('staff')
    .select('id,full_name')
    .eq('business_id', businessId)
    .eq('status', 'active')

  if (!data?.length) return []

  const staffIds = data.map((s) => s.id)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('staff_id')
    .eq('business_id', businessId)
    .in('staff_id', staffIds)
    .gte('booking_date', monthStart)

  const countMap = new Map<string, number>()
  ;(bookings ?? []).forEach((row) => {
    if (row.staff_id) {
      countMap.set(row.staff_id, (countMap.get(row.staff_id) ?? 0) + 1)
    }
  })

  return data
    .map((s) => ({
      name: s.full_name,
      bookingCount: countMap.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5)
}

async function getLowStockAlerts(businessId: string): Promise<LowStockItem[]> {
  const { data } = await supabase
    .from('products')
    .select('name,stock_quantity,low_stock_threshold')
    .eq('business_id', businessId)
    .eq('is_active', true)

  return (data ?? [])
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({ name: p.name, stock: p.stock_quantity, threshold: p.low_stock_threshold }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10)
}

async function getUpcomingBookings(businessId: string): Promise<UpcomingBooking[]> {
  const { data } = await supabase
    .from('bookings')
    .select('id,booking_date,start_time,status,customers(full_name),services(name)')
    .eq('business_id', businessId)
    .eq('booking_date', today)
    .gte('start_time', new Date().toTimeString().slice(0, 5))
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .order('start_time')

  return (data ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers
    const service = Array.isArray(row.services) ? row.services[0] : row.services
    return {
      id: row.id,
      customer: customer?.full_name ?? 'Unknown',
      service: service?.name ?? 'General',
      time: row.start_time?.slice(0, 5) ?? '-',
      status: row.status,
    }
  })
}

async function getRecentPayments(businessId: string): Promise<RecentPayment[]> {
  const { data } = await supabase
    .from('payments')
    .select('id,amount,payment_method,status,customers(full_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []).map((row) => {
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers
    return {
      id: row.id,
      amount: Number(row.amount),
      method: row.payment_method,
      status: row.status,
      customer_name: customer?.full_name ?? null,
    }
  })
}

async function getRecentActivity(businessId: string): Promise<RecentActivity[]> {
  const { data } = await supabase
    .from('audit_logs')
    .select('id,action,table_name,created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    table_name: row.table_name,
    created_at: row.created_at,
  }))
}

async function getSalesOverview(businessId: string): Promise<SalesOverview[]> {
  const days = lastNDays(7)
  const { data } = await supabase
    .from('payments')
    .select('amount,created_at')
    .eq('business_id', businessId)
    .gte('created_at', days[0])
    .in('status', ['verified', 'paid'])

  const dayMap = new Map<string, number>()
  days.forEach((d) => dayMap.set(d, 0))
  ;(data ?? []).forEach((row) => {
    const day = row.created_at?.slice(0, 10)
    if (day && dayMap.has(day)) {
      dayMap.set(day, dayMap.get(day)! + Number(row.amount))
    }
  })

  return days.map((d) => ({
    label: new Date(d).toLocaleString('en', { weekday: 'short' }),
    amount: dayMap.get(d) ?? 0,
  }))
}

async function getBookingTrend(businessId: string): Promise<BookingTrend[]> {
  const days = lastNDays(14)
  const { data } = await supabase
    .from('bookings')
    .select('booking_date')
    .eq('business_id', businessId)
    .gte('booking_date', days[0])

  const dayMap = new Map<string, number>()
  days.forEach((d) => dayMap.set(d, 0))
  ;(data ?? []).forEach((row) => {
    if (row.booking_date && dayMap.has(row.booking_date)) {
      dayMap.set(row.booking_date, dayMap.get(row.booking_date)! + 1)
    }
  })

  return days.map((d) => ({
    label: new Date(d).toLocaleString('en', { month: 'short', day: 'numeric' }),
    count: dayMap.get(d) ?? 0,
  }))
}

async function getMembershipGrowth(businessId: string): Promise<MembershipGrowth[]> {
  const months = lastNMonths(6)
  const { data } = await supabase
    .from('memberships')
    .select('created_at')
    .eq('business_id', businessId)
    .gte('created_at', months[0].start)

  const monthMap = new Map<string, number>()
  months.forEach((m) => monthMap.set(m.label, 0))
  ;(data ?? []).forEach((row) => {
    const created = row.created_at?.slice(0, 7)
    if (created) {
      const d = new Date(created + '-01')
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' })
      if (monthMap.has(label)) {
        monthMap.set(label, monthMap.get(label)! + 1)
      }
    }
  })

  let cumulative = 0
  return months.map((m) => {
    cumulative += monthMap.get(m.label) ?? 0
    return { label: m.label, count: cumulative }
  })
}
