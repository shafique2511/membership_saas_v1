import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { moduleLabels } from '@/services/packageCatalog'
import { getModules, type ModuleRow } from '@/services/packageSystem'
import type { ModuleKey } from '@/types'

export function ModuleManagementPage() {
  const [modules, setModules] = useState<ModuleRow[]>([])

  useEffect(() => {
    void getModules().then(setModules).catch(() => setModules([]))
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
        description="Super Admin module catalog used by packages, add-ons, RLS checks, and sidebar visibility."
      />
      <DataTable
        columns={[
          { key: 'module_name', header: 'Module' },
          { key: 'module_key', header: 'Key', render: (row) => <Badge variant="muted">{String(row.module_key)}</Badge> },
          { key: 'category', header: 'Category' },
          { key: 'is_core', header: 'Core', render: (row) => (row.is_core ? 'Yes' : 'No') },
          { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'disabled'} /> },
        ]}
        data={displayModules as unknown as Record<string, unknown>[]}
      />
    </div>
  )
}
