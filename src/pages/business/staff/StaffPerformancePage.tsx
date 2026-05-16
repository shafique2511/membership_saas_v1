import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { StaffTabs } from '@/pages/business/staff/StaffTabs'
import { getStaffPerformance } from '@/services/staff'

export function StaffPerformancePage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [performance, setPerformance] = useState<Record<string, unknown>[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    setPerformance(await getStaffPerformance(businessId) as Record<string, unknown>[])
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Staff performance</h2>
        <p className="text-sm text-slate-500">30-day performance metrics for active staff.</p>
      </div>
      <StaffTabs />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Active staff</p><p className="mt-1 text-2xl font-bold">{performance.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total bookings (30d)</p><p className="mt-1 text-2xl font-bold">{performance.reduce((s, p) => s + Number(p.completed_bookings_30d), 0)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Booking revenue (30d)</p><p className="mt-1 text-2xl font-bold text-teal-700">RM {performance.reduce((s, p) => s + Number(p.booking_revenue_30d), 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Pending commissions</p><p className="mt-1 text-2xl font-bold text-amber-600">RM {performance.reduce((s, p) => s + Number(p.pending_commission), 0).toFixed(2)}</p></CardContent></Card>
      </div>

      <DataTable
        columns={[
          { key: 'full_name', header: 'Staff' },
          { key: 'role', header: 'Role' },
          { key: 'completed_bookings_30d', header: 'Bookings (30d)' },
          { key: 'booking_revenue_30d', header: 'Revenue (30d)', render: (r) => `RM ${Number(r.booking_revenue_30d).toFixed(2)}` },
          { key: 'sales_30d', header: 'POS sales (30d)', render: (r) => `RM ${Number(r.sales_30d).toFixed(2)}` },
          { key: 'pending_commission', header: 'Pending', render: (r) => `RM ${Number(r.pending_commission).toFixed(2)}` },
          { key: 'total_commission', header: 'Total commission', render: (r) => `RM ${Number(r.total_commission).toFixed(2)}` },
          { key: 'target_sales', header: 'Target', render: (r) => `RM ${Number(r.target_sales).toLocaleString()}` },
          { key: 'target_bookings', header: 'Bookings target' },
        ]}
        data={performance}
        emptyMessage="No active staff found."
      />
    </div>
  )
}
