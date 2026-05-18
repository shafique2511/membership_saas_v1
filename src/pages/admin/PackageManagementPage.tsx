import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { packageCatalog } from '@/services/packageCatalog'
import { getPackages, getModules } from '@/services/packageSystem'
import { createPackage, deletePackage, updatePackage, listPackageModulesByPackage, assignModuleToPackage, removeModuleFromPackage } from '@/services/admin'

export function PackageManagementPage() {
  const [packages, setPackages] = useState<Record<string, unknown>[]>([])
  const [modules, setModules] = useState<Record<string, unknown>[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', monthly_price: '0', yearly_price: '0', setup_fee: '0', sort_order: '0' })

  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null)
  const [packageModules, setPackageModules] = useState<Record<string, unknown>[]>([])
  const [openModuleAssign, setOpenModuleAssign] = useState(false)
  const [moduleAssignForm, setModuleAssignForm] = useState({ module_key: 'booking', access_level: 'basic' })

  async function load() {
    setPackages(await getPackages() as unknown as Record<string, unknown>[])
  }

  async function loadModules() {
    setModules(await getModules() as unknown as Record<string, unknown>[])
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void load().catch(() => setPackages([])); void loadModules().catch(() => setModules([])) }, 0)
    return () => window.clearTimeout(task)
  }, [])

  useEffect(() => {
    if (selectedPkgId) {
      void listPackageModulesByPackage(selectedPkgId).then((data) => setPackageModules(data as unknown as Record<string, unknown>[])).catch(() => setPackageModules([]))
    } else {
      setPackageModules([])
    }
  }, [selectedPkgId])

  const displayPackages = packages.length
    ? packages
    : packageCatalog.map((item, index) => ({
        id: item.key,
        name: item.name,
        slug: item.key,
        description: item.summary,
        monthly_price: Number(item.monthlyPrice.replace(/\D/g, '')) || 0,
        yearly_price: 0,
        setup_fee: 0,
        is_active: true,
        sort_order: index,
      }))

  const assignedModuleKeys = new Set(packageModules.map((pm) => String((pm.modules as Record<string, unknown> | undefined)?.module_key ?? '')))
  const availableModules = modules.filter((m) => !assignedModuleKeys.has(String(m.module_key)))

  async function handleAssignModule() {
    await assignModuleToPackage(selectedPkgId!, moduleAssignForm.module_key, moduleAssignForm.access_level)
    setOpenModuleAssign(false)
    if (selectedPkgId) {
      setPackageModules(await listPackageModulesByPackage(selectedPkgId) as unknown as Record<string, unknown>[])
    }
  }

  async function handleRemoveModule(moduleKey: string) {
    if (!selectedPkgId) return
    await removeModuleFromPackage(selectedPkgId, moduleKey)
    setPackageModules(await listPackageModulesByPackage(selectedPkgId) as unknown as Record<string, unknown>[])
  }

  const selectedPackage = selectedPkgId ? packages.find((p) => String(p.id) === selectedPkgId) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package management"
        description="Create packages, set monthly/yearly prices, assign module rules, and manage package order."
        actions={<Button onClick={() => { setEditingId(null); setOpen(true) }}>Create package</Button>}
      />
      <DataTable
        columns={[
          { key: 'name', header: 'Package' },
          { key: 'slug', header: 'Slug', render: (row) => <Badge variant="muted">{String(row.slug)}</Badge> },
          { key: 'monthly_price', header: 'Monthly', render: (row) => `RM ${Number(row.monthly_price).toLocaleString()}` },
          { key: 'yearly_price', header: 'Yearly', render: (row) => `RM ${Number(row.yearly_price).toLocaleString()}` },
          { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'disabled'} /> },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setSelectedPkgId(String(row.id))
                }}>{selectedPkgId === String(row.id) ? 'Selected' : 'Modules'}</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingId(String(row.id))
                  setForm({
                    name: String(row.name ?? ''),
                    slug: String(row.slug ?? ''),
                    description: String(row.description ?? ''),
                    monthly_price: String(row.monthly_price ?? '0'),
                    yearly_price: String(row.yearly_price ?? '0'),
                    setup_fee: String(row.setup_fee ?? '0'),
                    sort_order: String(row.sort_order ?? '0'),
                  })
                  setOpen(true)
                }}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => void deletePackage(String(row.id)).then(load)}>Delete</Button>
              </div>
            ),
          },
        ]}
        data={displayPackages as unknown as Record<string, unknown>[]}
      />
      {selectedPkgId && (
        <Card>
          <CardHeader>
            <CardTitle>Module rules: {String(selectedPackage?.name ?? '') || selectedPkgId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DataTable columns={[
              { key: 'module_key', header: 'Module', render: (row) => {
                const mod = row.modules as Record<string, unknown> | undefined
                return mod ? String(mod.module_name ?? mod.module_key) : '-'
              }},
              { key: 'access_level', header: 'Access', render: (row) => <Badge>{String(row.access_level)}</Badge> },
              { key: 'is_enabled', header: 'Status', render: (row) => <StatusBadge status={row.is_enabled ? 'enabled' : 'disabled'} /> },
              { key: 'actions', header: '', render: (row) => {
                const mod = row.modules as Record<string, unknown> | undefined
                return <Button size="sm" variant="destructive" onClick={() => void handleRemoveModule(String(mod?.module_key ?? ''))}>Remove</Button>
              }},
            ]} data={packageModules} emptyMessage="No modules assigned to this package." />
            <Button onClick={() => setOpenModuleAssign(true)} disabled={availableModules.length === 0}>
              Assign module
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        {packageCatalog.map((item) => (
          <Card key={item.key}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.summary}</p>
              <p className="mt-4 text-xl font-semibold">{item.monthlyPrice}</p>
              <p className="mt-2 text-xs text-slate-500">{item.modules.length} enabled modules</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <FormModal
        open={open}
        title={editingId ? 'Edit package' : 'Create package'}
        submitLabel={editingId ? 'Save package' : 'Create package'}
        onSubmit={async () => {
          const payload = {
            name: form.name,
            slug: form.slug,
            description: form.description,
            monthly_price: Number(form.monthly_price),
            yearly_price: Number(form.yearly_price),
            setup_fee: Number(form.setup_fee),
            sort_order: Number(form.sort_order),
          }
          if (editingId) await updatePackage(editingId, payload)
          else await createPackage({ ...payload, is_active: true })
          setOpen(false)
          await load()
        }}
        onOpenChange={setOpen}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Package name" description="Display name shown to admins, owners, and subscription records.">
            <Input placeholder="Growth" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Package slug" description="Stable package identifier used in URLs, seed data, and subscription setup.">
            <Input placeholder="growth" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          </Field>
          <Field className="sm:col-span-2" label="Description" description="Short package summary for admin review and onboarding.">
            <Input placeholder="Best for growing businesses" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <Field label="Monthly price" description="Recurring monthly amount charged for this package.">
            <Input type="number" placeholder="0" value={form.monthly_price} onChange={(event) => setForm({ ...form, monthly_price: event.target.value })} />
          </Field>
          <Field label="Yearly price" description="Recurring annual amount when the business pays yearly.">
            <Input type="number" placeholder="0" value={form.yearly_price} onChange={(event) => setForm({ ...form, yearly_price: event.target.value })} />
          </Field>
          <Field label="Setup fee" description="One-time setup amount applied when onboarding the business.">
            <Input type="number" placeholder="0" value={form.setup_fee} onChange={(event) => setForm({ ...form, setup_fee: event.target.value })} />
          </Field>
          <Field label="Sort order" description="Lower numbers appear first in package lists.">
            <Input type="number" placeholder="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />
          </Field>
        </div>
      </FormModal>

      <FormModal open={openModuleAssign} title="Assign module to package" submitLabel="Assign" onSubmit={handleAssignModule} onOpenChange={setOpenModuleAssign}>
        <div className="space-y-3">
          <Field label="Module" description="Choose the feature area this package should unlock. Dependency rules may auto-add required modules.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={moduleAssignForm.module_key} onChange={(event) => setModuleAssignForm({ ...moduleAssignForm, module_key: event.target.value })}>
              {availableModules.map((m) => (
                <option key={String(m.id)} value={String(m.module_key)}>{String(m.module_name)} ({String(m.module_key)})</option>
              ))}
            </select>
          </Field>
          <Field label="Access level" description="Controls the limit tier or capability depth granted for this module.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={moduleAssignForm.access_level} onChange={(event) => setModuleAssignForm({ ...moduleAssignForm, access_level: event.target.value })}>
              <option value="basic">basic</option><option value="pro">pro</option><option value="advanced">advanced</option><option value="unlimited">unlimited</option>
            </select>
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
