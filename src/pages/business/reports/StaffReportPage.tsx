import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getStaffReport, type StaffReport } from '@/services/reports'

export function StaffReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<StaffReport | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getStaffReport(businessId)
    setReport(r)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Staff Report</h2>
        <p className="text-sm text-slate-500">Staff performance, productivity, and role distribution.</p>
      </div>
      <ReportTabs />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Staff</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_staff ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{report?.active_staff ?? 0}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Role</CardTitle></CardHeader>
          <CardContent>
            {report && report.by_role.length > 0 ? (
              <div className="space-y-2">
                {report.by_role.map((r) => (
                  <div key={r.role} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 capitalize">{r.role}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(r.count / report.total_staff) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top by Bookings</CardTitle></CardHeader>
          <CardContent>
            {report && report.top_by_bookings.length > 0 ? (
              <div className="space-y-2">
                {report.top_by_bookings.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-muted-foreground">#{i + 1}</span>
                    <span className="w-24 truncate">{s.name}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(s.booking_count / Math.max(...report.top_by_bookings.map((x) => x.booking_count))) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">{s.booking_count}</span>
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
