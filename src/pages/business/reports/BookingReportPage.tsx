import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getBookingReport, exportToCsv, type BookingReport, type ReportFilter } from '@/services/reports'

export function BookingReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<BookingReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getBookingReport(businessId, filter)
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
          <h2 className="text-lg font-semibold">Booking Report</h2>
          <p className="text-sm text-slate-500">Booking volume, status, and trends.</p>
        </div>
        <button className="text-sm text-muted-foreground underline" onClick={() => report && exportToCsv('booking-report', ['Status', 'Count'], report.by_status.map((s) => [s.status, String(s.count)]))}>CSV</button>
      </div>
      <ReportTabs />
      <div className="flex items-center gap-3">
        <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={filter.days} onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Confirmed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{report?.confirmed ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.completed ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cancelled</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{report?.cancelled ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">No-Show</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{report?.no_show ?? 0}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {report && report.by_status.length > 0 ? (
              <div className="space-y-2">
                {report.by_status.map((s) => (
                  <div key={s.status} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{s.status}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(s.count / report.total) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily Bookings</CardTitle></CardHeader>
          <CardContent>
            {report && report.daily.length > 0 ? (
              <div className="space-y-2">
                {report.daily.slice(-14).map((d) => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(d.count / Math.max(...report.daily.map((x) => x.count))) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{d.count}</span>
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
