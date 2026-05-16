import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getSalesReport, exportToCsv, exportToPdf, type SalesReport, type ReportFilter } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function SalesReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<SalesReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getSalesReport(businessId, filter)
    setReport(r)
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales Report</h2>
          <p className="text-sm text-slate-500">Revenue, orders, and payment analysis.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground underline" onClick={() => report && exportToCsv('sales-report', ['Date', 'Revenue', 'Orders'], (report.daily ?? []).map((d) => [d.date, String(d.revenue), String(d.orders)]))}>CSV</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => report && exportToPdf('sales-report', ['Date', 'Revenue', 'Orders'], (report.daily ?? []).map((d) => [d.date, String(d.revenue), String(d.orders)]))}>PDF</button>
        </div>
      </div>
      <ReportTabs />
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={filter.days}
          onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(report?.total_revenue ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Orders</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_orders ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Refunds</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(report?.total_refunds ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Order</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(report?.avg_order_value ?? 0)}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
          <CardContent>
            {report && report.daily.length > 0 ? (
              <div className="space-y-2">
                {report.daily.slice(-14).map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(d.revenue / report.total_revenue) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{formatCurrency(d.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {report && report.payment_methods.length > 0 ? (
              <div className="space-y-2">
                {report.payment_methods.map((m) => (
                  <div key={m.method} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{m.method.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(m.total / report.total_revenue) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{formatCurrency(m.total)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
