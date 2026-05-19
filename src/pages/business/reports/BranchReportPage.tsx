import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { exportToCsv, exportToExcel, exportToPdf, getBranchReport, type BranchReport, type ReportFilter } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function BranchReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<BranchReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    setReport(await getBranchReport(businessId, filter))
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const rows = (report?.by_branch ?? []).map((item) => [item.branch_name, String(item.bookings), String(item.orders), String(item.revenue)])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Branch Report</h2>
          <p className="text-sm text-slate-500">Branch comparison by bookings, orders, and revenue.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToCsv('branch-report', ['Branch', 'Bookings', 'Orders', 'Revenue'], rows)}>CSV</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => void exportToExcel('branch-report', ['Branch', 'Bookings', 'Orders', 'Revenue'], rows)}>Excel</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToPdf('branch-report', ['Branch', 'Bookings', 'Orders', 'Revenue'], rows)}>PDF</button>
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
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Branches</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_branches ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Branches</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.active_branches ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Forecast-ready</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.forecast_ready ? 'Yes' : 'No'}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Branch Comparison</CardTitle></CardHeader>
        <CardContent>
          {report && report.by_branch.length > 0 ? (
            <div className="space-y-2">
              {report.by_branch.map((item) => (
                <div key={item.branch_id} className="grid gap-2 rounded-md border border-border p-3 text-sm sm:grid-cols-4">
                  <span className="font-medium">{item.branch_name}</span>
                  <span>{item.bookings} bookings</span>
                  <span>{item.orders} orders</span>
                  <span>{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
