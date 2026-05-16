import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getDashboardSummary, getSalesReport, getBookingReport, exportToCsv, exportToPdf, type DashboardSummary, type SalesReport, type BookingReport } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function ExportCenterPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [bookings, setBookings] = useState<BookingReport | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const [s, sa, b] = await Promise.all([
      getDashboardSummary(businessId),
      getSalesReport(businessId),
      getBookingReport(businessId),
    ])
    setSummary(s)
    setSales(sa)
    setBookings(b)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const exports = [
    {
      name: 'Sales Report',
      description: 'Revenue, orders, refunds, payment methods',
      onCsv: () => sales && exportToCsv('sales-report', ['Date', 'Revenue', 'Orders'], (sales.daily ?? []).map((d) => [d.date, String(d.revenue), String(d.orders)])),
      onPdf: () => sales && exportToPdf('sales-report', ['Date', 'Revenue', 'Orders'], (sales.daily ?? []).map((d) => [d.date, String(d.revenue), String(d.orders)])),
    },
    {
      name: 'Booking Report',
      description: 'Booking volume, status breakdown',
      onCsv: () => bookings && exportToCsv('booking-report', ['Status', 'Count'], bookings.by_status.map((s) => [s.status, String(s.count)])),
      onPdf: () => bookings && exportToPdf('booking-report', ['Status', 'Count'], bookings.by_status.map((s) => [s.status, String(s.count)])),
    },
    {
      name: 'Dashboard Summary',
      description: 'Key metrics snapshot',
      onCsv: () => {
        const s = summary
        if (!s) return
        exportToCsv('dashboard-summary', ['Metric', 'Value'], [
          ['Revenue Today', String(s.revenue_today)],
          ['Revenue This Month', String(s.revenue_month)],
          ['Bookings Today', String(s.bookings_today)],
          ['Bookings This Month', String(s.bookings_month)],
          ['Active Members', String(s.active_members)],
          ['Low Stock Items', String(s.low_stock)],
          ['Pending Verifications', String(s.pending_verifications)],
          ['No-Show Rate', `${s.no_show_rate.toFixed(1)}%`],
        ])
      },
      onPdf: () => {
        const s = summary
        if (!s) return
        exportToPdf('dashboard-summary', ['Metric', 'Value'], [
          ['Revenue Today', formatCurrency(s.revenue_today)],
          ['Revenue This Month', formatCurrency(s.revenue_month)],
          ['Bookings Today', String(s.bookings_today)],
          ['Bookings This Month', String(s.bookings_month)],
          ['Active Members', String(s.active_members)],
          ['Low Stock Items', String(s.low_stock)],
          ['Pending Verifications', String(s.pending_verifications)],
          ['No-Show Rate', `${s.no_show_rate.toFixed(1)}%`],
        ])
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Export Center</h2>
        <p className="text-sm text-slate-500">Download reports as CSV or PDF.</p>
      </div>
      <ReportTabs />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exports.map((exp) => (
          <Card key={exp.name}>
            <CardHeader><CardTitle>{exp.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{exp.description}</p>
              <div className="flex gap-2">
                <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={exp.onCsv}>CSV</button>
                <button className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted" onClick={exp.onPdf}>PDF</button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
