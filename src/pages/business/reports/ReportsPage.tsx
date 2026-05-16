import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSalesReport, getBookingReport, type SalesSummary, type BookingSummary } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function ReportsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [sales, setSales] = useState<SalesSummary | null>(null)
  const [bookings, setBookings] = useState<BookingSummary | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const [s, b] = await Promise.all([getSalesReport(businessId), getBookingReport(businessId)])
    setSales(s)
    setBookings(b)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reports</h2>
        <p className="text-sm text-slate-500">Sales, booking, and performance summaries.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Revenue (30d)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(sales?.total_revenue ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Orders (30d)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{sales?.total_orders ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Order Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(sales?.avg_order_value ?? 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Bookings (30d)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{bookings?.total ?? 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
          <CardContent>
            {sales && sales.daily.length > 0 ? (
              <div className="space-y-2">
                {sales.daily.slice(-14).map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(d.revenue / sales.total_revenue) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{formatCurrency(d.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sales data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Booking Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {bookings && bookings.by_status.length > 0 ? (
              <div className="space-y-2">
                {bookings.by_status.map((s) => (
                  <div key={s.status} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{s.status}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(s.count / bookings.total) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No booking data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {sales && sales.payment_methods.length > 0 ? (
              <div className="space-y-2">
                {sales.payment_methods.map((m) => (
                  <div key={m.method} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{m.method.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(m.total / sales.total_revenue) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{formatCurrency(m.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payment data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bookings by Service</CardTitle></CardHeader>
          <CardContent>
            {bookings && bookings.by_service.length > 0 ? (
              <div className="space-y-2">
                {bookings.by_service.map((s) => (
                  <div key={s.service_name} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate">{s.service_name}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(s.count / bookings.total) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No booking data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
