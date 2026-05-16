import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { activateBusiness, createBusiness, listBusinesses, suspendBusiness, type BusinessRow } from '@/services/admin'

export function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', business_type: 'barber_shop', email: '', phone: '' })

  async function load() {
    setBusinesses(await listBusinesses())
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [])

  async function handleCreate() {
    await createBusiness(form)
    setOpen(false)
    setForm({ name: '', business_type: 'barber_shop', email: '', phone: '' })
    await load()
  }

  async function submitWrapper(event: FormEvent) {
    event.preventDefault()
    await handleCreate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Businesses"
        description="Create, edit, suspend, activate, and inspect tenant businesses."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create business</Button>}
      />
      <DataTable
        columns={[
          { key: 'name', header: 'Business', render: (row) => <Link className="font-medium text-teal-700" to={`/admin/businesses/${String(row.id)}`}>{String(row.name)}</Link> },
          { key: 'business_type', header: 'Type' },
          { key: 'email', header: 'Email' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void activateBusiness(String(row.id)).then(load)}>Activate</Button>
                <Button size="sm" variant="destructive" onClick={() => void suspendBusiness(String(row.id)).then(load)}>Suspend</Button>
              </div>
            ),
          },
        ]}
        data={businesses as unknown as Record<string, unknown>[]}
      />
      <FormModal open={open} title="Create business" submitLabel="Create" onSubmit={handleCreate} onOpenChange={setOpen}>
        <form className="space-y-3" onSubmit={submitWrapper}>
          <Input required placeholder="Business name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.business_type} onChange={(event) => setForm({ ...form, business_type: event.target.value })}>
            <option value="barber_shop">Barber shop</option>
            <option value="coffee_shop">Coffee shop</option>
            <option value="salon">Salon</option>
            <option value="spa">Spa</option>
            <option value="clinic">Clinic</option>
            <option value="event_space">Event space</option>
            <option value="custom">Custom</option>
          </select>
          <Input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </form>
      </FormModal>
    </div>
  )
}
