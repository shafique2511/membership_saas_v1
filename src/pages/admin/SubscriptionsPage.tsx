import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listSubscriptions, updateSubscription } from '@/services/admin'

export function SubscriptionsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  async function load() {
    setRows((await listSubscriptions()) as Record<string, unknown>[])
  }

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Assign packages, change package status, cancel subscriptions, and extend trials." />
      <DataTable
        columns={[
          { key: 'businesses', header: 'Business', render: (row) => String((row.businesses as { name?: string } | null)?.name ?? '-') },
          { key: 'packages', header: 'Package', render: (row) => String((row.packages as { name?: string } | null)?.name ?? '-') },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'billing_cycle', header: 'Cycle' },
          { key: 'trial_ends_at', header: 'Trial ends', render: (row) => String(row.trial_ends_at ?? '-') },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void updateSubscription(String(row.id), { status: 'active' }).then(load)}>Activate</Button>
                <Button size="sm" variant="outline" onClick={() => void updateSubscription(String(row.id), { trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString() }).then(load)}>Extend trial</Button>
                <Button size="sm" variant="destructive" onClick={() => void updateSubscription(String(row.id), { status: 'cancelled', end_date: new Date().toISOString().slice(0, 10) }).then(load)}>Cancel</Button>
              </div>
            ),
          },
        ]}
        data={rows}
      />
    </div>
  )
}
