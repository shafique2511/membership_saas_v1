import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { StaffTabs } from '@/pages/business/staff/StaffTabs'
import { getCommissionRecords, updateCommissionRecord, type CommissionRecord } from '@/services/staff'

export function CommissionReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [records, setRecords] = useState<(CommissionRecord & { staff?: { full_name: string }[] })[]>([])
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    if (!businessId) return
    setRecords(await getCommissionRecords(businessId, { status: statusFilter }) as (CommissionRecord & { staff?: { full_name: string }[] })[])
  }, [businessId, statusFilter])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const totalPending = records.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.commission_amount), 0)
  const totalApproved = records.filter((r) => r.status === 'approved').reduce((s, r) => s + Number(r.commission_amount), 0)
  const totalPaid = records.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.commission_amount), 0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Commission report</h2>
        <p className="text-sm text-slate-500">All commission records across staff.</p>
      </div>
      <StaffTabs />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Pending</p><p className="mt-1 text-xl font-bold text-amber-600">RM {totalPending.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Approved</p><p className="mt-1 text-xl font-bold text-blue-600">RM {totalApproved.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Paid</p><p className="mt-1 text-xl font-bold text-green-600">RM {totalPaid.toFixed(2)}</p></CardContent></Card>
      </div>

      <div className="flex gap-1">
        {['all', 'pending', 'approved', 'paid'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >{s}</button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short' }) },
          { key: 'staff', header: 'Staff', render: (r) => {
            const s = Array.isArray(r.staff) ? r.staff[0] : r.staff
            return s?.full_name ?? '-'
          }},
          { key: 'source_type', header: 'Source' },
          { key: 'commission_amount', header: 'Amount', render: (r) => `RM ${Number(r.commission_amount).toFixed(2)}` },
          { key: 'status', header: 'Status', render: (r) => (
            <div className="flex items-center gap-2">
              <Badge variant={r.status === 'paid' ? undefined : 'muted'}>{String(r.status)}</Badge>
              {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => void updateCommissionRecord(String(r.id), 'approved').then(load)}>Approve</Button>}
              {r.status === 'approved' && <Button size="sm" variant="outline" onClick={() => void updateCommissionRecord(String(r.id), 'paid').then(load)}>Pay</Button>}
            </div>
          )},
        ]}
        data={records as unknown as Record<string, unknown>[]}
        emptyMessage="No commission records."
      />
    </div>
  )
}
