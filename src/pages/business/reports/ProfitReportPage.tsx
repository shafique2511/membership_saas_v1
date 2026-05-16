import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getProfitReport, type ProfitReport, type ReportFilter } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function ProfitReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<ProfitReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getProfitReport(businessId, filter)
    setReport(r)
  }, [businessId, filter])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const maxVal = Math.max(report?.total_revenue ?? 1, report?.gross_profit ?? 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Profit Report</h2>
        <p className="text-sm text-slate-500">Revenue, costs, and profit margin analysis.</p>
      </div>
      <ReportTabs />
      <div className="flex items-center gap-3">
        <select className="rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={filter.days} onChange={(e) => setFilter((f) => ({ ...f, days: Number(e.target.value) }))}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(report?.total_revenue ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Refunds</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(report?.total_refunds ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gross Profit</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${(report?.gross_profit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(report?.gross_profit ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Margin</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${(report?.profit_margin ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(report?.profit_margin ?? 0).toFixed(1)}%</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Revenue vs Profit</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0">Revenue</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary rounded" style={{ width: `${((report?.total_revenue ?? 0) / maxVal) * 100}%` }} />
              </div>
              <span className="w-20 text-right">{formatCurrency(report?.total_revenue ?? 0)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0">Refunds</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div className="h-full bg-red-400 rounded" style={{ width: `${((report?.total_refunds ?? 0) / maxVal) * 100}%` }} />
              </div>
              <span className="w-20 text-right text-red-600">{formatCurrency(report?.total_refunds ?? 0)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0">Profit</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div className="h-full bg-emerald-400 rounded" style={{ width: `${((report?.gross_profit ?? 0) / maxVal) * 100}%` }} />
              </div>
              <span className="w-20 text-right text-emerald-600">{formatCurrency(report?.gross_profit ?? 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
