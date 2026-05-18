import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  cancelBusinessSubscription,
  extendBusinessTrial,
  getBusinessDetails,
  overrideModuleAccess,
  updateBusiness,
  changeBusinessPackage,
  createAddonViaRpc,
  cancelAddon,
} from '@/services/admin'
import { getPackages } from '@/services/packageSystem'
import { moduleLabels } from '@/services/packageCatalog'
import type { ModuleKey } from '@/types'

export function BusinessDetailsPage() {
  const params = useParams()
  const resolvedBusinessId = params.businessId || params.id || ''
  const [details, setDetails] = useState<Record<string, unknown> | null>(null)
  const [packages, setPackages] = useState<Record<string, unknown>[]>([])
  const [openOverride, setOpenOverride] = useState(false)
  const [openChangePackage, setOpenChangePackage] = useState(false)
  const [openAddon, setOpenAddon] = useState(false)
  const [moduleForm, setModuleForm] = useState({ module_key: 'booking' as ModuleKey, access_level: 'pro', is_enabled: true, end_date: '' })
  const [packageForm, setPackageForm] = useState({ package_id: '' })
  const [addonForm, setAddonForm] = useState({ module_key: 'booking' as ModuleKey, name: '', access_level: 'basic', price: '0' })

  const load = useCallback(async () => {
    setDetails(await getBusinessDetails(resolvedBusinessId))
  }, [resolvedBusinessId])

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (resolvedBusinessId) void load()
    }, 0)
    return () => window.clearTimeout(task)
  }, [resolvedBusinessId, load])

  useEffect(() => {
    void getPackages().then((data) => setPackages(data as unknown as Record<string, unknown>[])).catch(() => {})
  }, [])

  const business = details?.business as Record<string, unknown> | undefined
  const users = (details?.users as Record<string, unknown>[] | undefined) ?? []
  const subscriptions = (details?.subscriptions as Record<string, unknown>[] | undefined) ?? []
  const modules = (details?.modules as Record<string, unknown>[] | undefined) ?? []
  const usage = (details?.usage as Record<string, unknown>[] | undefined) ?? []
  const invoices = (details?.invoices as Record<string, unknown>[] | undefined) ?? []
  const addons = (details?.addons as Record<string, unknown>[] | undefined) ?? []

  async function handleOverride() {
    await overrideModuleAccess({
      business_id: resolvedBusinessId,
      module_key: moduleForm.module_key,
      access_level: moduleForm.access_level,
      is_enabled: moduleForm.is_enabled,
      end_date: moduleForm.end_date || null,
    })
    setOpenOverride(false)
    await load()
  }

  async function handleChangePackage() {
    await changeBusinessPackage(resolvedBusinessId, packageForm.package_id)
    setOpenChangePackage(false)
    await load()
  }

  async function handleCreateAddon() {
    await createAddonViaRpc({
      business_id: resolvedBusinessId,
      module_key: addonForm.module_key,
      name: addonForm.name,
      access_level: addonForm.access_level,
      price: Number(addonForm.price),
    })
    setOpenAddon(false)
    setAddonForm({ module_key: 'booking', name: '', access_level: 'basic', price: '0' })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(business?.name ?? 'Business details')}
        description="Tenant users, subscription, module overrides, add-ons, usage, and billing records."
        actions={
          <>
            <Button variant="outline" onClick={() => resolvedBusinessId && void updateBusiness(resolvedBusinessId, { status: 'active' }).then(load)}>Activate</Button>
            <Button variant="outline" onClick={() => resolvedBusinessId && void extendBusinessTrial(resolvedBusinessId, 7).then(load)}>Extend trial</Button>
            <Button variant="outline" onClick={() => resolvedBusinessId && void cancelBusinessSubscription(resolvedBusinessId).then(load)}>Cancel subscription</Button>
            <Button variant="destructive" onClick={() => resolvedBusinessId && void updateBusiness(resolvedBusinessId, { status: 'suspended' }).then(load)}>Suspend</Button>
            <Button variant="outline" onClick={() => setOpenChangePackage(true)}>Change package</Button>
            <Button variant="outline" onClick={() => setOpenAddon(true)}>Add add-on</Button>
            <Button onClick={() => setOpenOverride(true)}>Override module</Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Status</p><div className="mt-2"><StatusBadge status={String(business?.status ?? 'unknown')} /></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Type</p><p className="mt-2 font-medium">{String(business?.business_type ?? '-')}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Users</p><p className="mt-2 text-xl font-semibold">{users.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Invoices</p><p className="mt-2 text-xl font-semibold">{invoices.length}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Business users</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={[
            { key: 'full_name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Role', render: (row) => <Badge>{String(row.role)}</Badge> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          ]} data={users} />
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={[
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
              { key: 'billing_cycle', header: 'Cycle' },
              { key: 'start_date', header: 'Start' },
              { key: 'next_billing_date', header: 'Next billing' },
            ]} data={subscriptions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Usage limits</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={[
              { key: 'usage_key', header: 'Usage' },
              { key: 'used_count', header: 'Used' },
              { key: 'limit_count', header: 'Limit', render: (row) => String(row.limit_count ?? 'Unlimited') },
            ]} data={usage} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Module access</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={[
            { key: 'module_key', header: 'Module', render: (row) => moduleLabels[String(row.module_key) as ModuleKey] ?? String(row.module_key) },
            { key: 'access_level', header: 'Access', render: (row) => <Badge>{String(row.access_level)}</Badge> },
            { key: 'source', header: 'Source' },
            { key: 'is_enabled', header: 'Status', render: (row) => <StatusBadge status={row.is_enabled ? 'enabled' : 'disabled'} /> },
          ]} data={modules} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Add-ons</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={[
            { key: 'name', header: 'Add-on' },
            { key: 'module_key', header: 'Module', render: (row) => <Badge>{String(row.module_key)}</Badge> },
            { key: 'price', header: 'Price', render: (row) => `RM ${Number(row.price ?? 0).toLocaleString()}` },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
            { key: 'actions', header: '', render: (row) => (
              <Button size="sm" variant="destructive" disabled={String(row.status) !== 'active'} onClick={() => void cancelAddon(String(row.id)).then(load)}>Cancel</Button>
            )},
          ]} data={addons} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Billing invoices</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={[
            { key: 'invoice_number', header: 'Invoice' },
            { key: 'amount', header: 'Amount', render: (row) => `RM ${Number(row.amount ?? 0).toLocaleString()}` },
            { key: 'due_date', header: 'Due' },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          ]} data={invoices} />
        </CardContent>
      </Card>

      <FormModal open={openOverride} title="Override module access" submitLabel="Save override" onSubmit={handleOverride} onOpenChange={setOpenOverride}>
        <div className="space-y-3">
          <Field label="Module" description="Feature area to override for this business only.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={moduleForm.module_key} onChange={(event) => setModuleForm({ ...moduleForm, module_key: event.target.value as ModuleKey })}>
              {Object.entries(moduleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
          <Field label="Access level" description="Override tier for this module. Use none to block access.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={moduleForm.access_level} onChange={(event) => setModuleForm({ ...moduleForm, access_level: event.target.value })}>
              <option value="none">none</option><option value="basic">basic</option><option value="pro">pro</option><option value="advanced">advanced</option><option value="unlimited">unlimited</option>
            </select>
          </Field>
          <Field label="End date" description="Optional date when the override should expire. Leave blank for no expiry.">
            <Input type="date" value={moduleForm.end_date} onChange={(event) => setModuleForm({ ...moduleForm, end_date: event.target.value })} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={moduleForm.is_enabled} onChange={(event) => setModuleForm({ ...moduleForm, is_enabled: event.target.checked })} />
            <span><span className="font-medium">Enabled</span><span className="block text-xs text-slate-500 dark:text-slate-400">When off, this override disables the module even if the package includes it.</span></span>
          </label>
        </div>
      </FormModal>

      <FormModal open={openChangePackage} title="Change package" submitLabel="Change package" onSubmit={handleChangePackage} onOpenChange={setOpenChangePackage}>
        <div className="space-y-3">
          <Field label="New package" description="Select the package that should replace the current business subscription.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={packageForm.package_id} onChange={(event) => setPackageForm({ ...packageForm, package_id: event.target.value })}>
              <option value="">Select a package</option>
              {packages.map((pkg) => (
                <option key={String(pkg.id)} value={String(pkg.id)}>{String(pkg.name)}</option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-slate-500">This will cancel the current subscription and create a new active one with the selected package. Module access will be updated.</p>
        </div>
      </FormModal>

      <FormModal open={openAddon} title="Add paid add-on" submitLabel="Create add-on" onSubmit={handleCreateAddon} onOpenChange={setOpenAddon}>
        <div className="space-y-3">
          <Field label="Module" description="Feature area this add-on unlocks for this business.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={addonForm.module_key} onChange={(event) => setAddonForm({ ...addonForm, module_key: event.target.value as ModuleKey })}>
              {Object.entries(moduleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
          <Field label="Add-on name" description="Display name used in add-on history and billing review.">
            <Input placeholder="Extra booking capacity" value={addonForm.name} onChange={(event) => setAddonForm({ ...addonForm, name: event.target.value })} />
          </Field>
          <Field label="Access level" description="Tier or capacity granted by this add-on.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={addonForm.access_level} onChange={(event) => setAddonForm({ ...addonForm, access_level: event.target.value })}>
              <option value="basic">basic</option><option value="pro">pro</option><option value="advanced">advanced</option><option value="unlimited">unlimited</option>
            </select>
          </Field>
          <Field label="Price" description="Amount charged for this add-on. Use 0 for a complimentary manual grant.">
            <Input type="number" placeholder="0" value={addonForm.price} onChange={(event) => setAddonForm({ ...addonForm, price: event.target.value })} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
