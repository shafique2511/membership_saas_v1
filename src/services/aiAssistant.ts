import { supabase } from '@/lib/supabase'
import { getFinancialSummaryReport } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export type AIInsightType = 'sales' | 'customers' | 'marketing' | 'service' | 'product' | 'staff' | 'booking' | 'membership' | 'report'

export interface AIInsight {
  id: string
  type: AIInsightType
  title: string
  summary: string
  recommendation: string
  metric?: string
}

export interface AIAssistantSnapshot {
  generatedAt: string
  insights: AIInsight[]
  quickStats: {
    todaySales: number
    monthSales: number
    inactiveCustomers: number
    noShows90Days: number
  }
}

export type AIPromptKey =
  | 'today_sales'
  | 'monthly_performance'
  | 'inactive_customers'
  | 'promo_campaign'
  | 'best_service'
  | 'best_product'
  | 'staff_performance'
  | 'no_show_pattern'
  | 'membership_package'
  | 'whatsapp_promo'
  | 'retention_strategy'
  | 'explain_report'

interface NamedMetric {
  name: string
  count: number
  revenue: number
}

function startOfMonth(offset = 0): Date {
  const date = new Date()
  date.setMonth(date.getMonth() + offset, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfWeek(): Date {
  const date = new Date()
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000)
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function topMetric(rows: NamedMetric[]): NamedMetric | null {
  return rows.sort((a, b) => b.revenue - a.revenue || b.count - a.count)[0] ?? null
}

function addMetric(map: Map<string, NamedMetric>, name: string, revenue: number, count = 1): void {
  const row = map.get(name) ?? { name, revenue: 0, count: 0 }
  row.revenue += revenue
  row.count += count
  map.set(name, row)
}

async function getInactiveCustomerCount(businessId: string, days = 60): Promise<number> {
  const cutoff = daysAgo(days).toISOString()
  const cutoffDate = cutoff.slice(0, 10)
  const [{ data: customers }, { data: bookings }, { data: payments }] = await Promise.all([
    supabase.from('customers').select('id').eq('business_id', businessId).eq('status', 'active'),
    supabase.from('bookings').select('customer_id').eq('business_id', businessId).gte('booking_date', cutoffDate),
    supabase.from('payments').select('customer_id').eq('business_id', businessId).gte('created_at', cutoff),
  ])

  const activeIds = new Set<string>()
  for (const booking of bookings ?? []) {
    if (booking.customer_id) activeIds.add(booking.customer_id)
  }
  for (const payment of payments ?? []) {
    if (payment.customer_id) activeIds.add(payment.customer_id)
  }

  return (customers ?? []).filter((customer) => !activeIds.has(customer.id)).length
}

async function getBestSellingService(businessId: string): Promise<NamedMetric | null> {
  const start = startOfMonth().toISOString()
  const startDate = start.slice(0, 10)
  const [{ data: bookings }, { data: orders }] = await Promise.all([
    supabase
      .from('bookings')
      .select('service_id, total_amount, services(name)')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('booking_date', startDate),
    supabase
      .from('pos_orders')
      .select('id')
      .eq('business_id', businessId)
      .eq('order_status', 'completed')
      .gte('created_at', start),
  ])

  const orderIds = (orders ?? []).map((order) => order.id)
  const { data: items } = orderIds.length
    ? await supabase
        .from('pos_order_items')
        .select('item_name, total_price, quantity')
        .in('order_id', orderIds)
        .eq('item_type', 'service')
    : { data: [] }

  const map = new Map<string, NamedMetric>()
  for (const booking of bookings ?? []) {
    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
    addMetric(map, service?.name ?? 'Booking service', Number(booking.total_amount ?? 0))
  }
  for (const item of items ?? []) {
    addMetric(map, item.item_name, Number(item.total_price ?? 0), Number(item.quantity ?? 1))
  }

  return topMetric(Array.from(map.values()))
}

async function getBestSellingProduct(businessId: string): Promise<NamedMetric | null> {
  const start = startOfMonth().toISOString()
  const { data: orders } = await supabase
    .from('pos_orders')
    .select('id')
    .eq('business_id', businessId)
    .eq('order_status', 'completed')
    .gte('created_at', start)

  const orderIds = (orders ?? []).map((order) => order.id)
  const { data: items } = orderIds.length
    ? await supabase
        .from('pos_order_items')
        .select('item_name, total_price, quantity')
        .in('order_id', orderIds)
        .eq('item_type', 'product')
    : { data: [] }

  const map = new Map<string, NamedMetric>()
  for (const item of items ?? []) {
    addMetric(map, item.item_name, Number(item.total_price ?? 0), Number(item.quantity ?? 1))
  }
  return topMetric(Array.from(map.values()))
}

async function getTopStaffThisWeek(businessId: string): Promise<NamedMetric | null> {
  const weekStart = startOfWeek().toISOString().slice(0, 10)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('staff_id, total_amount, staff(full_name)')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('booking_date', weekStart)

  const map = new Map<string, NamedMetric>()
  for (const booking of bookings ?? []) {
    const staff = Array.isArray(booking.staff) ? booking.staff[0] : booking.staff
    if (!staff?.full_name) continue
    addMetric(map, staff.full_name, Number(booking.total_amount ?? 0))
  }
  return topMetric(Array.from(map.values()))
}

async function getNoShowPattern(businessId: string): Promise<{ total: number; pattern: string }> {
  const startDate = daysAgo(90).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('bookings')
    .select('booking_date, staff_id, staff(full_name)')
    .eq('business_id', businessId)
    .eq('status', 'no_show')
    .gte('booking_date', startDate)

  const rows = data ?? []
  const dayMap = new Map<string, number>()
  const staffMap = new Map<string, number>()
  for (const booking of rows) {
    const weekday = new Date(booking.booking_date).toLocaleDateString('en', { weekday: 'long' })
    dayMap.set(weekday, (dayMap.get(weekday) ?? 0) + 1)
    const staff = Array.isArray(booking.staff) ? booking.staff[0] : booking.staff
    if (staff?.full_name) staffMap.set(staff.full_name, (staffMap.get(staff.full_name) ?? 0) + 1)
  }

  const topDay = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0]
  const topStaff = Array.from(staffMap.entries()).sort((a, b) => b[1] - a[1])[0]
  const parts = [
    topDay ? `${topDay[0]} has the most no-shows (${topDay[1]})` : null,
    topStaff ? `${topStaff[0]} is most affected (${topStaff[1]})` : null,
  ].filter(Boolean)

  return { total: rows.length, pattern: parts.join('. ') || 'No clear no-show pattern yet.' }
}

async function getMembershipMonthChange(businessId: string): Promise<{ current: number; previous: number; change: number }> {
  const currentStart = startOfMonth(0).toISOString()
  const previousStart = startOfMonth(-1).toISOString()
  const nextStart = startOfMonth(1).toISOString()
  const { data: orders } = await supabase
    .from('pos_orders')
    .select('id, created_at')
    .eq('business_id', businessId)
    .eq('order_status', 'completed')
    .gte('created_at', previousStart)
    .lt('created_at', nextStart)

  const orderIds = (orders ?? []).map((order) => order.id)
  const { data: items } = orderIds.length
    ? await supabase
        .from('pos_order_items')
        .select('order_id, total_price')
        .in('order_id', orderIds)
        .eq('item_type', 'membership')
    : { data: [] }

  const orderDates = new Map((orders ?? []).map((order) => [order.id, order.created_at]))
  let current = 0
  let previous = 0
  for (const item of items ?? []) {
    const orderDate = orderDates.get(item.order_id)
    if (!orderDate) continue
    if (orderDate >= currentStart) current += Number(item.total_price ?? 0)
    else previous += Number(item.total_price ?? 0)
  }

  return { current, previous, change: pctChange(current, previous) }
}

async function getBusinessName(businessId: string): Promise<string> {
  const { data } = await supabase.from('businesses').select('name').eq('id', businessId).single()
  return data?.name ?? 'your business'
}

export async function getAIAssistantSnapshot(businessId: string): Promise<AIAssistantSnapshot> {
  const [today, month, inactiveCustomers, bestService, bestProduct, topStaff, noShows, membership] = await Promise.all([
    getFinancialSummaryReport(businessId, { days: 1 }),
    getFinancialSummaryReport(businessId, { startDate: startOfMonth().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) }),
    getInactiveCustomerCount(businessId, 60),
    getBestSellingService(businessId),
    getBestSellingProduct(businessId),
    getTopStaffThisWeek(businessId),
    getNoShowPattern(businessId),
    getMembershipMonthChange(businessId),
  ])

  const insights: AIInsight[] = [
    {
      id: 'inactive-customers',
      type: 'customers',
      title: 'Inactive customers',
      metric: String(inactiveCustomers),
      summary: `You have ${inactiveCustomers} inactive customers from the last 60 days.`,
      recommendation: inactiveCustomers > 0 ? 'Send a short WhatsApp promo with a limited-time discount.' : 'Keep collecting visits before running a win-back campaign.',
    },
    {
      id: 'best-service',
      type: 'service',
      title: 'Best-selling service',
      metric: bestService ? formatCurrency(bestService.revenue) : formatCurrency(0),
      summary: bestService ? `Your best-selling service this month is ${bestService.name}.` : 'No completed service sales found this month.',
      recommendation: bestService ? `Feature ${bestService.name} in your next campaign or bundle it with a membership offer.` : 'Complete more bookings or POS service sales to build this insight.',
    },
    {
      id: 'best-product',
      type: 'product',
      title: 'Best-selling product',
      metric: bestProduct ? formatCurrency(bestProduct.revenue) : formatCurrency(0),
      summary: bestProduct ? `${bestProduct.name} is your best-selling product this month.` : 'No completed product sales found this month.',
      recommendation: bestProduct ? 'Check stock levels and prepare a product bundle.' : 'Add product sales through POS to generate product insights.',
    },
    {
      id: 'membership-trend',
      type: 'membership',
      title: 'Membership trend',
      metric: `${membership.change.toFixed(0)}%`,
      summary: `Membership sales are ${membership.change >= 0 ? 'up' : 'down'} ${Math.abs(membership.change).toFixed(0)}% compared to last month.`,
      recommendation: membership.change < 0 ? 'Offer a visit-credit package to recent customers.' : 'Use the current package as the anchor offer for retention.',
    },
    {
      id: 'staff-performance',
      type: 'staff',
      title: 'Staff performance',
      metric: topStaff ? `${topStaff.count} bookings` : '0 bookings',
      summary: topStaff ? `Staff ${topStaff.name} has the highest completed bookings this week.` : 'No completed staff bookings found this week.',
      recommendation: topStaff ? 'Use this as a coaching benchmark for the team.' : 'Assign staff to bookings to unlock staff insights.',
    },
    {
      id: 'no-show-pattern',
      type: 'booking',
      title: 'No-show pattern',
      metric: String(noShows.total),
      summary: noShows.total > 0 ? noShows.pattern : 'No no-show records found in the last 90 days.',
      recommendation: noShows.total > 0 ? 'Tighten reminders or require deposits for the affected pattern.' : 'Current no-show risk looks low.',
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    insights,
    quickStats: {
      todaySales: today.net_sales,
      monthSales: month.net_sales,
      inactiveCustomers,
      noShows90Days: noShows.total,
    },
  }
}

export async function answerAIAssistantPrompt(businessId: string, promptKey: AIPromptKey): Promise<string> {
  const [businessName, snapshot] = await Promise.all([
    getBusinessName(businessId),
    getAIAssistantSnapshot(businessId),
  ])
  const insight = (id: string) => snapshot.insights.find((item) => item.id === id)

  switch (promptKey) {
    case 'today_sales':
      return `Today net sales are ${formatCurrency(snapshot.quickStats.todaySales)}. If this is below your normal weekday baseline, send a same-day WhatsApp offer to recent customers.`
    case 'monthly_performance':
      return `This month net sales are ${formatCurrency(snapshot.quickStats.monthSales)}. ${insight('membership-trend')?.summary ?? ''}`
    case 'inactive_customers':
      return `${insight('inactive-customers')?.summary} ${insight('inactive-customers')?.recommendation}`
    case 'promo_campaign':
      return `Suggested campaign: send inactive customers a limited RM5 return-visit promo, valid for 7 days. Lead with the best-selling service when available.`
    case 'best_service':
      return `${insight('best-service')?.summary} ${insight('best-service')?.recommendation}`
    case 'best_product':
      return `${insight('best-product')?.summary} ${insight('best-product')?.recommendation}`
    case 'staff_performance':
      return `${insight('staff-performance')?.summary} ${insight('staff-performance')?.recommendation}`
    case 'no_show_pattern':
      return `${insight('no-show-pattern')?.summary} ${insight('no-show-pattern')?.recommendation}`
    case 'membership_package':
      return `Suggested membership package: bundle your best-selling service into a prepaid 3-visit or 5-visit package with a small bonus reward. Keep the offer simple and easy to explain at checkout.`
    case 'whatsapp_promo':
      return `Hi, this is ${businessName}. We miss you. Enjoy RM5 off your next visit this week. Reply BOOK to reserve your slot.`
    case 'retention_strategy':
      return `Retention strategy: contact inactive customers, promote your strongest service, and follow up no-shows with a deposit-backed rebooking option. Track conversion from WhatsApp replies.`
    case 'explain_report':
      return `Simple report summary: net sales show money kept after discounts and refunds. Product profit deducts product cost. Service profit is estimated after staff commission. Membership sales show prepaid package demand.`
    default:
      return 'Choose an AI action to generate a business-specific insight.'
  }
}
