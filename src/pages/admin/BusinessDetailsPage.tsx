import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getBusinessDetails, overrideModuleAccess, updateBusiness } from '@/services/admin'
import { moduleLabels } from '@/services/packageCatalog'
import type { ModuleKey } from '@/types'

export function BusinessDetailsPage() {
  const { businessId = '' } = useParams()
  const [details, setDetails] = useState<Record<string, unknown> | null>(null)
  const [open, setOpen] = useState(false)
  const [moduleForm, setModuleForm] = useState({ module_key: 'booking' as ModuleKey, access_level: 'pro', is_enabled: true, end_date: '' })

  const load = useCallback(async () => {
    setDetails(await getBusinessDetails(businessId))
  }, [businessId])

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (businessId) void load()
    }, 0)
    return () => window.clearTimeout(task)
  }, [businessId, load])

  const business = details?.business as Record<string, unknown> | undefined
  const users = (details?.users as Record<string, unknown>[] | undefined) ?? []
  const subscriptions = (details?.subscriptions as Record<string, unknown>[] | undefined) ?? []
  const modules = (details?.modules as Record<string, unknown>[] | undefined) ?? []
  const usage = (details?.usage as Record<string, unknown>[] | undefined) ?? []
  const invoices = (details?.invoices as Record<string, unknown>[] | undefined) ?? []

  async function handleOverride() {
    await overrideModuleAccess({
      business_id: businessId,
      module_key: moduleForm.module_key,
      access_level: moduleForm.access_level,
      is_enabled: moduleForm.is_enabled,
      end_date: moduleForm.end_date || null,
    })
    setOpen(false)
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(business?.name ?? 'Business details')}
        description="Tenant users, subscription, module overrides, usage, and billing records."
        actions={
          <>
            <Button variant="outline" onClick={() => businessId && void updateBusiness(businessId, { status: 'active' }).then(load)}>Activate</Button>
            <Button variant="destructive" onClick={() => businessId && void updateBusiness(businessId, { status: 'suspended' }).then(load)}>Suspend</Button>
            <Button onClick={() => setOpen(true)}>Override module</Button>
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
      <FormModal open={open} title="Override module access" submitLabel="Save override" onSubmit={handleOverride} onOpenChange={setOpen}>
        <div className="space-y-3">
          <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={moduleForm.module_key} onChange={(event) => setModuleForm({ ...moduleForm, module_key: event.target.value as ModuleKey })}>
            {Object.entries(moduleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={moduleForm.access_level} onChange={(event) => setModuleForm({ ...moduleForm, access_level: event.target.value })}>
            <option value="none">none</option><option value="basic">basic</option><option value="pro">pro</option><option value="advanced">advanced</option><option value="unlimited">unlimited</option>
          </select>
          <Input type="date" value={moduleForm.end_date} onChange={(event) => setModuleForm({ ...moduleForm, end_date: event.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={moduleForm.is_enabled} onChange={(event) => setModuleForm({ ...moduleForm, is_enabled: event.target.checked })} /> Enabled</label>
        </div>
      </FormModal>
    </div>
  )
}
