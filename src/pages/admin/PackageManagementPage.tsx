import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { packageCatalog } from '@/services/packageCatalog'
import { getPackages, type PackageRow } from '@/services/packageSystem'

export function PackageManagementPage() {
  const [packages, setPackages] = useState<PackageRow[]>([])

  useEffect(() => {
    void getPackages().then(setPackages).catch(() => setPackages([]))
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
        description="Super Admin package catalog with pricing, active state, and sellable package order."
      />
      <DataTable
        columns={[
          { key: 'name', header: 'Package' },
          { key: 'slug', header: 'Slug', render: (row) => <Badge variant="muted">{String(row.slug)}</Badge> },
          { key: 'monthly_price', header: 'Monthly', render: (row) => `RM ${Number(row.monthly_price).toLocaleString()}` },
          { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'disabled'} /> },
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
    </div>
  )
}
