import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StaffTabs } from '@/pages/business/staff/StaffTabs'
import { getStaff, createStaff, updateStaff, type Staff } from '@/services/staff'

export function StaffListPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [staff, setStaff] = useState<(Staff & { branches?: { name: string }[] })[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', role: 'staff', commission_rate: '0',
    commission_type: 'percentage', target_sales: '0', target_bookings: '0',
    status: 'active' as string, notes: '',
  })

  const load = useCallback(async () => {
    if (!businessId) return
    setStaff(await getStaff(businessId, { search: search || undefined, status: statusFilter }) as (Staff & { branches?: { name: string }[] })[])
  }, [businessId, search, statusFilter])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSubmit() {
    const payload = {
      business_id: businessId, full_name: form.full_name,
      phone: form.phone || null, email: form.email || null,
      role: form.role, commission_rate: Number(form.commission_rate),
      commission_type: form.commission_type, target_sales: Number(form.target_sales),
      target_bookings: Number(form.target_bookings), status: form.status,
      working_hours: {}, off_days: [], notes: form.notes || null,
    }
    if (editingId) {
      await updateStaff(editingId, payload as Partial<Staff>)
    } else {
      await createStaff(payload as Partial<Staff>)
    }
    setOpen(false)
    setEditingId(null)
    setForm({ full_name: '', email: '', phone: '', role: 'staff', commission_rate: '0', commission_type: 'percentage', target_sales: '0', target_bookings: '0', status: 'active', notes: '' })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Staff</h2>
          <p className="text-sm text-slate-500">{staff.length} team members</p>
        </div>
        <Button onClick={() => { setEditingId(null); setOpen(true) }}>Add staff</Button>
      </div>
      <StaffTabs />

      <div className="flex gap-2">
        <div className="flex gap-1">
          {['all', 'active', 'inactive', 'suspended'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >{s}</button>
          ))}
        </div>
        <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="ml-auto w-64" />
      </div>

      <DataTable
        columns={[
          { key: 'full_name', header: 'Name', render: (r) => <Link className="font-medium text-teal-700" to={`/business/staff/${String(r.id)}`}>{String(r.full_name)}</Link> },
          { key: 'email', header: 'Email', render: (r) => String(r.email ?? '-') },
          { key: 'phone', header: 'Phone' },
          { key: 'role', header: 'Role', render: (r) => <Badge variant="muted">{String(r.role)}</Badge> },
          { key: 'branches', header: 'Branch', render: (r) => {
            const b = Array.isArray(r.branches) ? r.branches[0] : r.branches
            return b?.name ?? '-'
          }},
          { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'active' ? undefined : 'muted'}>{String(r.status)}</Badge> },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                setEditingId(String(r.id))
                setForm({
                  full_name: String(r.full_name ?? ''), email: String(r.email ?? ''), phone: String(r.phone ?? ''),
                  role: String(r.role ?? 'staff'), commission_rate: String(r.commission_rate ?? '0'),
                  commission_type: String(r.commission_type ?? 'percentage'),
                  target_sales: String(r.target_sales ?? '0'), target_bookings: String(r.target_bookings ?? '0'),
                  status: String(r.status ?? 'active'), notes: String(r.notes ?? ''),
                })
                setOpen(true)
              }}>Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => void updateStaff(String(r.id), { status: r.status === 'active' ? 'inactive' : 'active' } as Partial<Staff>).then(load)}>
                {r.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )},
        ]}
        data={staff as unknown as Record<string, unknown>[]}
        emptyMessage="No staff members. Add your first staff."
      />

      <FormModal open={open} title={editingId ? 'Edit staff' : 'Add staff'} submitLabel={editingId ? 'Save' : 'Create'} onSubmit={handleSubmit} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null) }}}>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <Field label="Full name" description="Staff display name used in bookings, commission records, and schedules.">
            <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Email" description="Optional login or contact email for this staff member.">
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone" description="Staff contact number for internal reference.">
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Role" description="Job title shown in staff lists, such as barber, stylist, therapist, or cashier.">
            <Input placeholder="Role (staff, barber, stylist...)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </Field>
          <Field label="Commission type" description="Choose whether commission is percentage-based or a fixed amount.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value })}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (RM)</option>
            </select>
          </Field>
          <Field label="Commission rate" description="Percentage rate or fixed RM amount, based on commission type.">
            <Input type="number" placeholder="Commission rate" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
          </Field>
          <Field label="Target sales" description="Optional monthly sales target for performance tracking.">
            <Input type="number" placeholder="Target sales (RM)" value={form.target_sales} onChange={(e) => setForm({ ...form, target_sales: e.target.value })} />
          </Field>
          <Field label="Target bookings" description="Optional booking count target for performance tracking.">
            <Input type="number" placeholder="Target bookings" value={form.target_bookings} onChange={(e) => setForm({ ...form, target_bookings: e.target.value })} />
          </Field>
          <Field label="Status" description="Inactive or suspended staff cannot be used as active workers.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <Field className="sm:col-span-2" label="Notes" description="Internal notes about skills, employment details, or preferences.">
            <textarea className="h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
