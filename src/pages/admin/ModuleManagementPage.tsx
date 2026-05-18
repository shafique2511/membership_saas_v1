import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { moduleLabels } from '@/services/packageCatalog'
import { getModules, type ModuleRow } from '@/services/packageSystem'
import type { ModuleKey } from '@/types'
import { createModule, updateModule } from '@/services/admin'

export function ModuleManagementPage() {
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ module_key: '', module_name: '', description: '', category: 'platform', sort_order: '0', is_core: false, is_active: true })

  async function load() {
    setModules(await getModules())
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load().catch(() => setModules([])), 0)
    return () => window.clearTimeout(task)
  }, [])

  const displayModules = modules.length
    ? modules
    : Object.entries(moduleLabels).map(([key, label], index) => ({
        id: key,
        module_key: key as ModuleKey,
        module_name: label,
        description: null,
        category: key === 'white_label' ? 'enterprise' : 'platform',
        is_core: key === 'core',
        is_active: true,
        sort_order: index,
      }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module management"
        description="Create modules, edit categories, enable or disable modules, and define package access levels."
        actions={<Button onClick={() => { setEditingId(null); setOpen(true) }}>Create module</Button>}
      />
      <DataTable
        columns={[
          { key: 'module_name', header: 'Module' },
          { key: 'module_key', header: 'Key', render: (row) => <Badge variant="muted">{String(row.module_key)}</Badge> },
          { key: 'category', header: 'Category' },
          { key: 'is_core', header: 'Core', render: (row) => (row.is_core ? 'Yes' : 'No') },
          { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'disabled'} /> },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setEditingId(String(row.id))
                  setForm({
                    module_key: String(row.module_key ?? ''),
                    module_name: String(row.module_name ?? ''),
                    description: String(row.description ?? ''),
                    category: String(row.category ?? 'platform'),
                    sort_order: String(row.sort_order ?? '0'),
                    is_core: Boolean(row.is_core),
                    is_active: Boolean(row.is_active),
                  })
                  setOpen(true)
                }}>Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => void updateModule(String(row.id), { is_active: !row.is_active }).then(load)}>
                  {row.is_active ? 'Disable' : 'Enable'}
                </Button>
              </div>
            ),
          },
        ]}
        data={displayModules as unknown as Record<string, unknown>[]}
      />
      <FormModal
        open={open}
        title={editingId ? 'Edit module' : 'Create module'}
        submitLabel={editingId ? 'Save module' : 'Create module'}
        onSubmit={async () => {
          const payload = {
            module_key: form.module_key,
            module_name: form.module_name,
            description: form.description,
            category: form.category,
            sort_order: Number(form.sort_order),
            is_core: form.is_core,
            is_active: form.is_active,
          }
          if (editingId) await updateModule(editingId, payload)
          else await createModule(payload)
          setOpen(false)
          await load()
        }}
        onOpenChange={setOpen}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Module key" description="Stable internal key used by code, package rules, permissions, and RLS checks.">
            <Input placeholder="booking" value={form.module_key} onChange={(event) => setForm({ ...form, module_key: event.target.value })} />
          </Field>
          <Field label="Module name" description="Human-readable name shown in admin and business dashboards.">
            <Input placeholder="Booking" value={form.module_name} onChange={(event) => setForm({ ...form, module_name: event.target.value })} />
          </Field>
          <Field label="Category" description="Groups related modules in admin screens and package planning.">
            <Input placeholder="platform" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </Field>
          <Field label="Sort order" description="Lower numbers appear first in module lists.">
            <Input type="number" placeholder="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />
          </Field>
          <Field className="sm:col-span-2" label="Description" description="Short explanation of what this module unlocks.">
            <Input placeholder="What this module controls" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={form.is_core} onChange={(event) => setForm({ ...form, is_core: event.target.checked })} />
            <span><span className="font-medium">Core module</span><span className="block text-xs text-slate-500 dark:text-slate-400">Marks this as a required system module for tenant operation.</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            <span><span className="font-medium">Enabled</span><span className="block text-xs text-slate-500 dark:text-slate-400">Disabled modules cannot be assigned to packages or tenants.</span></span>
          </label>
        </div>
      </FormModal>
    </div>
  )
}
