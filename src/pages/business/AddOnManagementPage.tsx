import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppContext } from '@/context/useAppContext'
import { moduleLabels } from '@/services/packageCatalog'
import { getAddons } from '@/services/packageSystem'

export function AddOnManagementPage() {
  const { profile } = useAppContext()
  const [addons, setAddons] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    if (!profile?.business_id) {
      return
    }

    void getAddons(profile.business_id).then((data) => setAddons(data as Record<string, unknown>[]))
  }, [profile?.business_id])

  return (
    <div className="space-y-6">
      <PageHeader title="Add-ons" description="Temporary or paid add-ons can unlock modules, raise limits, and expire automatically." />
      {addons.length ? (
        <DataTable
          columns={[
            { key: 'name', header: 'Add-on' },
            { key: 'module_key', header: 'Module', render: (row) => moduleLabels[String(row.module_key) as keyof typeof moduleLabels] ?? String(row.module_key) },
            { key: 'access_level', header: 'Access', render: (row) => <Badge>{String(row.access_level)}</Badge> },
            { key: 'end_date', header: 'Expires', render: (row) => String(row.end_date ?? 'No expiry') },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          ]}
          data={addons}
        />
      ) : (
        <EmptyState
          title="No active add-ons"
          description="Add-ons will appear here after Super Admin enables extra modules or temporary limit increases."
        />
      )}
    </div>
  )
}
