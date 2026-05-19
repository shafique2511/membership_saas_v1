import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { exportToCsv, exportToExcel, exportToPdf, getLoyaltyReport, type LoyaltyReport, type ReportFilter } from '@/services/reports'

export function LoyaltyReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<LoyaltyReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    setReport(await getLoyaltyReport(businessId, filter))
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const rows = (report?.by_type ?? []).map((item) => [item.type, String(item.points), String(item.count)])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Loyalty Report</h2>
          <p className="text-sm text-slate-500">Points earned, redeemed, and adjusted during the selected period.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToCsv('loyalty-report', ['Type', 'Points', 'Count'], rows)}>CSV</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => void exportToExcel('loyalty-report', ['Type', 'Points', 'Count'], rows)}>Excel</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToPdf('loyalty-report', ['Type', 'Points', 'Count'], rows)}>PDF</button>
        </div>
      </div>
      <ReportTabs />
      <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={filter.days} onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
        <option value={365}>Last year</option>
      </select>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Points Earned</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.total_points_earned ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Points Redeemed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{report?.total_points_redeemed ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Customers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.active_members ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Transaction Types</CardTitle></CardHeader>
        <CardContent>
          {report && report.by_type.length > 0 ? (
            <div className="space-y-2">
              {report.by_type.map((item) => (
                <div key={item.type} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 capitalize">{item.type.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-4 overflow-hidden rounded bg-muted">
                    <div className="h-full rounded bg-primary" style={{ width: `${(Math.abs(item.points) / Math.max(1, Math.max(...report.by_type.map((x) => Math.abs(x.points))))) * 100}%` }} />
                  </div>
                  <span className="w-20 text-right text-muted-foreground">{item.points}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
