import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormModal } from '@/components/ui/FormModal'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { getStaffMember, updateStaff, getStaffServices, removeStaffService, getCommissionRecords, updateCommissionRecord, getStaffAppointments, type Staff, type StaffService, type CommissionRecord } from '@/services/staff'

export function StaffDetailsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const { staffId = '' } = useParams()
  const [staff, setStaff] = useState<(Staff & { branches?: { name: string }[] }) | null>(null)
  const [services, setServices] = useState<(StaffService & { services?: { name: string; price: number }[] })[]>([])
  const [commissions, setCommissions] = useState<(CommissionRecord & { staff?: { full_name: string }[] })[]>([])
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', role: '', commission_rate: '0',
    commission_type: 'percentage', target_sales: '0', target_bookings: '0', notes: '',
  })

  const load = useCallback(async () => {
    if (!staffId) return
    setStaff(await getStaffMember(staffId) as (Staff & { branches?: { name: string }[] }) | null)
    setServices(await getStaffServices(staffId) as (StaffService & { services?: { name: string; price: number }[] })[])
    setCommissions(await getCommissionRecords(businessId, { staff_id: staffId }) as (CommissionRecord & { staff?: { full_name: string }[] })[])
    const today = new Date()
    const weekFromNow = new Date(today.getTime() + 7 * 86400000)
    setAppointments(await getStaffAppointments(staffId, today.toISOString().slice(0, 10), weekFromNow.toISOString().slice(0, 10)) as Record<string, unknown>[])
  }, [staffId, businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  useEffect(() => {
    if (staff) setForm({
      full_name: staff.full_name, phone: staff.phone ?? '', email: staff.email ?? '',
      role: staff.role, commission_rate: String(staff.commission_rate),
      commission_type: staff.commission_type,
      target_sales: String(staff.target_sales), target_bookings: String(staff.target_bookings),
      notes: staff.notes ?? '',
    })
  }, [staff])

  async function handleUpdate() {
    if (!staffId) return
    await updateStaff(staffId, {
      full_name: form.full_name, phone: form.phone || null, email: form.email || null,
      role: form.role, commission_rate: Number(form.commission_rate),
      commission_type: form.commission_type as 'fixed' | 'percentage',
      target_sales: Number(form.target_sales), target_bookings: Number(form.target_bookings),
      notes: form.notes || null,
    } as Partial<Staff>)
    setEditOpen(false)
    await load()
  }

  if (!staff) return <div className="py-20 text-center text-slate-500">Loading...</div>
  const branch = Array.isArray(staff.branches) ? staff.branches[0] : staff.branches

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{staff.full_name}</h2>
          <p className="text-sm text-slate-500">{staff.role} · {branch?.name ?? 'No branch'} · <Badge variant={staff.status === 'active' ? undefined : 'muted'}>{staff.status}</Badge></p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>Edit profile</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Commission</p><p className="mt-1 text-lg font-bold">{staff.commission_type === 'percentage' ? `${staff.commission_rate}%` : `RM ${staff.commission_rate}`}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Target sales</p><p className="mt-1 text-lg font-bold">RM {staff.target_sales.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Target bookings</p><p className="mt-1 text-lg font-bold">{staff.target_bookings}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Assigned services</p><p className="mt-1 text-lg font-bold">{services.length}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Assigned services</CardTitle><Button size="sm" onClick={() => setServiceOpen(true)}>Assign</Button></CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'services', header: 'Service', render: (r) => {
                  const s = Array.isArray(r.services) ? r.services[0] : r.services
                  return s?.name ?? '-'
                }},
                { key: 'commission_type', header: 'Type' },
                { key: 'commission_value', header: 'Value', render: (r) => String(r.commission_value) },
                { key: 'actions', header: '', render: (r) => <Button size="sm" variant="destructive" onClick={() => void removeStaffService(String(r.id)).then(load)}>Remove</Button> },
              ]}
              data={services as unknown as Record<string, unknown>[]}
              emptyMessage="No services assigned."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming appointments (7 days)</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'booking_date', header: 'Date', render: (r) => String(r.booking_date) },
                { key: 'start_time', header: 'Time', render: (r) => String(r.start_time) },
                { key: 'customers', header: 'Customer', render: (r) => {
                  const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
                  return c?.full_name ?? '-'
                }},
                { key: 'services', header: 'Service', render: (r) => {
                  const s = Array.isArray(r.services) ? r.services[0] : r.services
                  return s?.name ?? '-'
                }},
                { key: 'status', header: 'Status' },
              ]}
              data={appointments}
              emptyMessage="No upcoming appointments."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Commission history</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short' }) },
              { key: 'source_type', header: 'Source' },
              { key: 'commission_amount', header: 'Amount', render: (r) => `RM ${Number(r.commission_amount).toFixed(2)}` },
          { key: 'status', header: 'Status', render: (r) => (
            <div className="flex items-center gap-2">
              <Badge variant={String(r.status) === 'paid' ? undefined : 'muted'}>{String(r.status)}</Badge>
              {String(r.status) === 'pending' && <Button size="sm" variant="outline" onClick={() => void updateCommissionRecord(String(r.id), 'approved').then(load)}>Approve</Button>}
              {String(r.status) === 'approved' && <Button size="sm" variant="outline" onClick={() => void updateCommissionRecord(String(r.id), 'paid').then(load)}>Pay</Button>}
            </div>
          )},
            ]}
            data={commissions as unknown as Record<string, unknown>[]}
            emptyMessage="No commission records."
          />
        </CardContent>
      </Card>

      <FormModal open={editOpen} title="Edit staff" submitLabel="Save" onSubmit={handleUpdate} onOpenChange={(v) => { if (!v) setEditOpen(false) }}>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value })}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (RM)</option>
          </select>
          <Input type="number" placeholder="Commission rate" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
          <Input type="number" placeholder="Target sales" value={form.target_sales} onChange={(e) => setForm({ ...form, target_sales: e.target.value })} />
          <Input type="number" placeholder="Target bookings" value={form.target_bookings} onChange={(e) => setForm({ ...form, target_bookings: e.target.value })} />
          <textarea className="sm:col-span-2 h-16 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </FormModal>

      <FormModal open={serviceOpen} title="Assign service" submitLabel="" onSubmit={() => {}} onOpenChange={(v) => { if (!v) setServiceOpen(false) }}>
        <p className="text-sm text-slate-500">Service assignment modal would open here with service selector.</p>
      </FormModal>
    </div>
  )
}
