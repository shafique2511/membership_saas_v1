import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getMembershipReport, exportToCsv, type MembershipReport } from '@/services/reports'

export function MembershipReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<MembershipReport | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getMembershipReport(businessId)
    setReport(r)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Membership Report</h2>
          <p className="text-sm text-slate-500">Member growth, plan distribution, and retention.</p>
        </div>
        <button className="text-sm text-muted-foreground underline" onClick={() => report && exportToCsv('membership-report', ['Plan', 'Members'], report.by_plan.map((p) => [p.plan_name, String(p.count)]))}>CSV</button>
      </div>
      <ReportTabs />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Members</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_members ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.active_members ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expired</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{report?.expired_members ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expiring Soon</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{report?.expiring_soon ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>By Plan</CardTitle></CardHeader>
        <CardContent>
          {report && report.by_plan.length > 0 ? (
            <div className="space-y-2">
              {report.by_plan.map((p) => (
                <div key={p.plan_name} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0">{p.plan_name}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary rounded" style={{ width: `${(p.count / report.total_members) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-muted-foreground">{p.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
