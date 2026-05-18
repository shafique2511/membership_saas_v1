import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { supabase } from '@/lib/supabase'
import { listAddons, cancelAddon, createAddonViaRpc } from '@/services/admin'
import { moduleLabels } from '@/services/packageCatalog'
import type { ModuleKey } from '@/types'

export function AddOnsManagementPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ business_id: '', module_key: 'booking' as ModuleKey, name: '', access_level: 'basic', price: '0' })
  const [businesses, setBusinesses] = useState<Record<string, unknown>[]>([])

  async function load() {
    setRows(await listAddons() as Record<string, unknown>[])
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [])

  useEffect(() => {
    async function loadBusinesses() {
      const { data } = await supabase.from('businesses').select('id,name').eq('status', 'active').order('name')
      if (data) setBusinesses(data)
    }
    void loadBusinesses()
  }, [])

  async function handleCreate() {
    await createAddonViaRpc({
      business_id: form.business_id,
      module_key: form.module_key,
      name: form.name,
      access_level: form.access_level,
      price: Number(form.price),
    })
    setOpen(false)
    setForm({ business_id: '', module_key: 'booking', name: '', access_level: 'basic', price: '0' })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add-ons"
        description="Paid and manual add-ons across all tenant businesses."
        actions={<Button onClick={() => setOpen(true)}>Create add-on</Button>}
      />
      <DataTable
        columns={[
          { key: 'name', header: 'Add-on' },
          { key: 'businesses', header: 'Business', render: (row) => String((row.businesses as { name?: string } | null)?.name ?? (row.business_id ?? '-')) },
          { key: 'module_key', header: 'Module', render: (row) => <Badge>{moduleLabels[String(row.module_key) as ModuleKey] ?? String(row.module_key)}</Badge> },
          { key: 'access_level', header: 'Access', render: (row) => <Badge>{String(row.access_level)}</Badge> },
          { key: 'price', header: 'Price', render: (row) => `RM ${Number(row.price ?? 0).toLocaleString()}` },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <Button size="sm" variant="destructive" disabled={String(row.status) !== 'active'} onClick={() => void cancelAddon(String(row.id)).then(load)}>Cancel</Button>
            ),
          },
        ]}
        data={rows}
      />
      <FormModal open={open} title="Create add-on" submitLabel="Create" onSubmit={handleCreate} onOpenChange={setOpen}>
        <div className="space-y-3">
          <Field label="Business" description="The tenant that will receive this paid or manual module add-on.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.business_id} onChange={(event) => setForm({ ...form, business_id: event.target.value })}>
              <option value="">Select a business</option>
              {businesses.map((b) => (
                <option key={String(b.id)} value={String(b.id)}>{String(b.name)}</option>
              ))}
            </select>
          </Field>
          <Field label="Module" description="The feature area this add-on unlocks for the selected business.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.module_key} onChange={(event) => setForm({ ...form, module_key: event.target.value as ModuleKey })}>
              {Object.entries(moduleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
          <Field label="Add-on name" description="Display name shown in add-on history and billing review.">
            <Input placeholder="Extra booking capacity" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Access level" description="Sets the tier or capacity this add-on grants for the module.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.access_level} onChange={(event) => setForm({ ...form, access_level: event.target.value })}>
              <option value="basic">basic</option><option value="pro">pro</option><option value="advanced">advanced</option><option value="unlimited">unlimited</option>
            </select>
          </Field>
          <Field label="Price" description="Amount charged for this add-on. Use 0 for a complimentary manual grant.">
            <Input type="number" placeholder="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
