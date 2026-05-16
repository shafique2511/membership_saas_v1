import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { packageCatalog } from '@/services/packageCatalog'
import { getPackages, type PackageRow } from '@/services/packageSystem'
import { createPackage, deletePackage, updatePackage } from '@/services/admin'

export function PackageManagementPage() {
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', monthly_price: '0', yearly_price: '0', setup_fee: '0', sort_order: '0' })

  async function load() {
    setPackages(await getPackages())
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load().catch(() => setPackages([])), 0)
    return () => window.clearTimeout(task)
  }, [])

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package management"
        description="Create packages, set monthly/yearly prices, assign package rules, and manage sellable package order."
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
          <Input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          <Input className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <Input type="number" placeholder="Monthly price" value={form.monthly_price} onChange={(event) => setForm({ ...form, monthly_price: event.target.value })} />
          <Input type="number" placeholder="Yearly price" value={form.yearly_price} onChange={(event) => setForm({ ...form, yearly_price: event.target.value })} />
          <Input type="number" placeholder="Setup fee" value={form.setup_fee} onChange={(event) => setForm({ ...form, setup_fee: event.target.value })} />
          <Input type="number" placeholder="Sort order" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />
        </div>
      </FormModal>
    </div>
  )
}
