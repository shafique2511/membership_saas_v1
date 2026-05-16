import { supabase } from '@/lib/supabase'

export interface SalesSummary {
  total_revenue: number
  total_orders: number
  avg_order_value: number
  payment_methods: { method: string; total: number; count: number }[]
  daily: { date: string; revenue: number; orders: number }[]
}

export interface BookingSummary {
  total: number
  by_status: { status: string; count: number }[]
  by_service: { service_name: string; count: number }[]
}

export async function getSalesReport(businessId: string, days = 30): Promise<SalesSummary> {
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'paid')
    .gte('paid_at', new Date(Date.now() - days * 86400000).toISOString())

  const rows = payments ?? []
  const total_revenue = rows.reduce((s, r) => s + Number(r.amount), 0)
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
    total_orders: rows.length,
    avg_order_value: rows.length ? total_revenue / rows.length : 0,
    payment_methods: Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v })),
    daily: Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export async function getBookingReport(businessId: string, days = 30): Promise<BookingSummary> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('status')
    .eq('business_id', businessId)
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())

  const rows = bookings ?? []
  const statusMap = new Map<string, number>()

  for (const b of rows) {
    statusMap.set(b.status, (statusMap.get(b.status) ?? 0) + 1)
  }

  return {
    total: rows.length,
    by_status: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    by_service: [],
  }
}
