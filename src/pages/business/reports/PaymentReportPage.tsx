import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getPaymentReport, type PaymentReport } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function PaymentReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<PaymentReport | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getPaymentReport(businessId)
    setReport(r)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payment Report</h2>
        <p className="text-sm text-slate-500">Payment collection, methods, and verification status.</p>
      </div>
      <ReportTabs />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Collected</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(report?.total_collected ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Verify</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{report?.pending_verification ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Refunds</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(report?.refunds_this_period ?? 0)}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Method</CardTitle></CardHeader>
          <CardContent>
            {report && report.by_method.length > 0 ? (
              <div className="space-y-2">
                {report.by_method.map((m) => (
                  <div key={m.method} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{m.method.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(m.total / report.total_collected) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{formatCurrency(m.total)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent>
            {report && report.by_status.length > 0 ? (
              <div className="space-y-2">
                {report.by_status.map((s) => (
                  <div key={s.status} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{s.status}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(s.total / report.by_status.reduce((a, x) => a + x.total, 0)) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{formatCurrency(s.total)}</span>
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
