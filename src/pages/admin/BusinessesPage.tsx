import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { activateBusiness, createBusinessWithSubscription, listBusinesses, suspendBusiness, type BusinessRow } from '@/services/admin'

export function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', business_type: 'barber_shop', email: '', phone: '', package_slug: 'starter', skip_trial: false })

  async function load() {
    setBusinesses(await listBusinesses())
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [])

  async function handleCreate() {
    await createBusinessWithSubscription({
      name: form.name,
      business_type: form.business_type,
      email: form.email || undefined,
      phone: form.phone || undefined,
      package_slug: form.package_slug,
      skip_trial: form.skip_trial,
    })
    setOpen(false)
    setForm({ name: '', business_type: 'barber_shop', email: '', phone: '', package_slug: 'starter', skip_trial: false })
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
          <Field label="Business name" description="The tenant name shown in admin lists, owner dashboard, receipts, and customer pages.">
            <Input required placeholder="Business name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Business type" description="Used for labels and setup defaults. The owner can still enable or disable modules later.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.business_type} onChange={(event) => setForm({ ...form, business_type: event.target.value })}>
              <option value="barber_shop">Barber shop</option>
              <option value="coffee_shop">Coffee shop</option>
              <option value="salon">Salon</option>
              <option value="spa">Spa</option>
              <option value="clinic">Clinic</option>
              <option value="event_space">Event space</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Owner email" description="Optional contact email for the business owner or main administrator.">
            <Input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Business phone" description="Optional phone number used for contact and business records.">
            <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label="Starting package" description="Controls the modules and usage limits assigned when the business is created.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.package_slug} onChange={(event) => setForm({ ...form, package_slug: event.target.value })}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="business_suite">Business Suite</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={form.skip_trial} onChange={(event) => setForm({ ...form, skip_trial: event.target.checked })} />
            <span><span className="font-medium">Skip trial</span><span className="block text-xs text-slate-500 dark:text-slate-400">Activate the subscription immediately instead of starting a trial period.</span></span>
          </label>
        </form>
      </FormModal>
    </div>
  )
}
