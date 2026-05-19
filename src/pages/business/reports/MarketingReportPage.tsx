import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { exportToCsv, exportToExcel, exportToPdf, getMarketingReport, type MarketingReport, type ReportFilter } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function MarketingReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<MarketingReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    setReport(await getMarketingReport(businessId, filter))
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const rows = (report?.by_campaign ?? []).map((item) => [item.name, String(item.reached), String(item.converted), String(item.revenue)])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Marketing Report</h2>
          <p className="text-sm text-slate-500">Campaign reach, conversion, and attributed revenue.</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToCsv('marketing-report', ['Campaign', 'Reached', 'Converted', 'Revenue'], rows)}>CSV</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => void exportToExcel('marketing-report', ['Campaign', 'Reached', 'Converted', 'Revenue'], rows)}>Excel</button>
          <button className="text-sm text-muted-foreground underline" onClick={() => exportToPdf('marketing-report', ['Campaign', 'Reached', 'Converted', 'Revenue'], rows)}>PDF</button>
        </div>
      </div>
      <ReportTabs />
      <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={filter.days} onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
        <option value={365}>Last year</option>
      </select>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Campaigns</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_campaigns ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Sent</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.sent_campaigns ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Converted</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_converted ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(report?.total_revenue ?? 0)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Campaign Performance</CardTitle></CardHeader>
        <CardContent>
          {report && report.by_campaign.length > 0 ? (
            <div className="space-y-2">
              {report.by_campaign.map((item) => (
                <div key={item.name} className="grid gap-2 rounded-md border border-border p-3 text-sm sm:grid-cols-4">
                  <span className="font-medium">{item.name}</span>
                  <span>{item.reached} reached</span>
                  <span>{item.converted} converted</span>
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
