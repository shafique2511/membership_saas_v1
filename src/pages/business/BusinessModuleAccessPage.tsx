import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppContext } from '@/context/useAppContext'
import { moduleLabels } from '@/services/packageCatalog'
import { getBusinessModuleAccess, type ModuleAccessRow } from '@/services/packageSystem'

export function BusinessModuleAccessPage() {
  const { profile } = useAppContext()
  const [accessRows, setAccessRows] = useState<ModuleAccessRow[]>([])

  useEffect(() => {
    if (!profile?.business_id) {
      return
    }

    void getBusinessModuleAccess(profile.business_id).then(setAccessRows)
  }, [profile?.business_id])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module access"
        description="Enabled modules, access levels, sources, expiry, and module-level limits for this business."
      />
      <DataTable
        columns={[
          { key: 'module_key', header: 'Module', render: (row) => moduleLabels[String(row.module_key) as keyof typeof moduleLabels] ?? String(row.module_key) },
          { key: 'access_level', header: 'Access', render: (row) => <Badge>{String(row.access_level)}</Badge> },
          { key: 'source', header: 'Source', render: (row) => <Badge variant="muted">{String(row.source)}</Badge> },
          { key: 'end_date', header: 'Expires', render: (row) => String(row.end_date ?? 'No expiry') },
          { key: 'is_enabled', header: 'Status', render: (row) => <StatusBadge status={row.is_enabled ? 'enabled' : 'disabled'} /> },
        ]}
        data={accessRows as unknown as Record<string, unknown>[]}
      />
    </div>
  )
}
