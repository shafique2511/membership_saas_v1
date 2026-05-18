import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createPlatformBackupRequest, listBackupRequests } from '@/services/admin'

export function BackupHistoryPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [requestType, setRequestType] = useState('full_platform')

  async function load() {
    setRows(await listBackupRequests() as Record<string, unknown>[])
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch(() => setRows([])), 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleCreate() {
    await createPlatformBackupRequest({ request_type: requestType, reason })
    setOpen(false)
    setReason('')
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup history"
        description="Platform and business backup requests for disaster recovery, migration, legal, and shutdown workflows."
        actions={<Button onClick={() => setOpen(true)}>Create backup request</Button>}
      />
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'request_type', header: 'Type', render: (row) => <Badge>{String(row.request_type)}</Badge> },
              { key: 'scope', header: 'Scope' },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
              { key: 'reason', header: 'Reason', render: (row) => String(row.reason ?? '-') },
              { key: 'created_at', header: 'Created', render: (row) => new Date(String(row.created_at)).toLocaleString() },
              { key: 'expires_at', header: 'Expires', render: (row) => row.expires_at ? new Date(String(row.expires_at)).toLocaleString() : '-' },
            ]}
            data={rows}
            emptyMessage="No backup requests yet."
          />
        </CardContent>
      </Card>

      <FormModal open={open} title="Create backup request" submitLabel="Create request" onSubmit={handleCreate} onOpenChange={setOpen}>
        <div className="space-y-3">
          <Field label="Backup type" description="Choose why the platform backup is being prepared.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
              <option value="full_platform">Full platform</option>
              <option value="database">Database</option>
              <option value="storage">File storage</option>
              <option value="migration">Migration</option>
              <option value="shutdown">Shutdown</option>
            </select>
          </Field>
          <Field label="Reason" description="Required audit context for backup creation.">
            <Input required placeholder="Disaster recovery test, migration, legal request..." value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
