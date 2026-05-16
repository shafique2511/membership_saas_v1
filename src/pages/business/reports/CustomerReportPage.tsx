import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getCustomerReport, type CustomerReport, type ReportFilter } from '@/services/reports'

export function CustomerReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<CustomerReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getCustomerReport(businessId, filter)
    setReport(r)
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Customer Report</h2>
        <p className="text-sm text-slate-500">Customer acquisition and activity analysis.</p>
      </div>
      <ReportTabs />
      <div className="flex items-center gap-3">
        <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={filter.days} onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Customers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_customers ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">New This Period</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.new_this_period ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active This Period</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{report?.active_this_period ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>New Customers Over Time</CardTitle></CardHeader>
        <CardContent>
          {report && report.by_join_date.length > 0 ? (
            <div className="space-y-2">
              {report.by_join_date.slice(-14).map((d) => (
                <div key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary rounded" style={{ width: `${(d.count / Math.max(...report.by_join_date.map((x) => x.count))) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground">{d.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
