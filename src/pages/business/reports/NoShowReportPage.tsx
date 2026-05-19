import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { exportToCsv, exportToExcel, exportToPdf, getNoShowReport, type NoShowReport, type ReportFilter } from '@/services/reports'

export function NoShowReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<NoShowReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    setReport(await getNoShowReport(businessId, filter))
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const rows = (report?.recent ?? []).map((item) => [item.date, item.customer, item.staff])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">No-show Report</h2>
          <p className="text-sm text-slate-500">No-show rate, recent no-shows, and staff breakdown.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToCsv('no-show-report', ['Date', 'Customer', 'Staff'], rows)}>CSV</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => void exportToExcel('no-show-report', ['Date', 'Customer', 'Staff'], rows)}>Excel</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToPdf('no-show-report', ['Date', 'Customer', 'Staff'], rows)}>PDF</button>
        </div>
      </div>
      <ReportTabs />
      <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={filter.days} onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
        <option value={365}>Last year</option>
      </select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">No-shows</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{report?.total_no_shows ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">No-show Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{(report?.no_show_rate ?? 0).toFixed(1)}%</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Staff</CardTitle></CardHeader>
          <CardContent>
            {report && report.by_staff.length > 0 ? (
              <div className="space-y-2">
                {report.by_staff.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent No-shows</CardTitle></CardHeader>
          <CardContent>
            {report && report.recent.length > 0 ? (
              <div className="space-y-2">
                {report.recent.map((item) => (
                  <div key={`${item.date}-${item.customer}-${item.staff}`} className="flex items-center justify-between gap-3 text-sm">
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                    <span className="truncate text-muted-foreground">{item.customer}</span>
                    <span className="truncate text-muted-foreground">{item.staff}</span>
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
