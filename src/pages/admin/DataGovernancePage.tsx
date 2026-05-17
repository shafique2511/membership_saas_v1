import { useCallback, useEffect, useState } from 'react'
import { Database, Server, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { listPlatformBackupLogs, logPlatformBackup, type PlatformBackupLog } from '@/services/dataGovernance'

const backupCommands = [
  'supabase db dump --linked --file backups/schema-and-data.sql',
  'supabase storage download --recursive business-assets ./backups/storage',
  'pg_dump "$DATABASE_URL" --format=custom --file=backups/platform.dump',
]

export function DataGovernancePage() {
  const [logs, setLogs] = useState<PlatformBackupLog[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    backup_type: 'manual',
    backup_scope: 'full_platform',
    status: 'planned',
    storage_location: '',
    checksum: '',
    retention_until: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLogs(await listPlatformBackupLogs())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleSubmit() {
    await logPlatformBackup({
      backup_type: form.backup_type,
      backup_scope: form.backup_scope,
      status: form.status,
      storage_location: form.storage_location || undefined,
      checksum: form.checksum || undefined,
      retention_until: form.retention_until || undefined,
      notes: form.notes || undefined,
    })
    setOpen(false)
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data governance"
        description="Platform backup logs, data ownership policy, migration support, and shutdown operating procedure."
        actions={<Button onClick={() => setOpen(true)}>Log backup action</Button>}
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />Ownership</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Businesses own business and customer data. The platform owns software, infrastructure, branding, and global configuration.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="h-4 w-4" />Platform backups</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Super admins may create full backups for disaster recovery, legal compliance, hosting migration, restore tests, or shutdown.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />Business exports</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Business owners export their tenant data from the business settings module. Export logs remain visible for audit.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Backup runbook</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">Run these from a trusted admin machine or CI job with server-side credentials. Never run service-role or database backup commands in browser code.</p>
          <div className="space-y-2">
            {backupCommands.map((cmd) => (
              <pre key={cmd} className="overflow-x-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{cmd}</pre>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Platform backup log</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState label="Loading platform backups" />
          ) : logs.length === 0 ? (
            <EmptyState icon={Database} title="No backup logs" description="Log backup, migration, restore-test, legal-hold, or shutdown actions here." />
          ) : (
            <DataTable
              columns={[
                { key: 'created_at', header: 'Created' },
                { key: 'backup_type', header: 'Type' },
                { key: 'backup_scope', header: 'Scope' },
                { key: 'status', header: 'Status' },
                { key: 'storage_location', header: 'Location' },
                { key: 'retention_until', header: 'Retain until' },
              ]}
              data={logs as unknown as Record<string, unknown>[]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Shutdown procedure</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>1. Announce shutdown and export window to business owners.</p>
          <p>2. Create and verify full platform backup.</p>
          <p>3. Freeze destructive writes if needed.</p>
          <p>4. Support business exports and migration requests.</p>
          <p>5. Retain backups only as long as required by contract, law, or recovery policy.</p>
        </CardContent>
      </Card>

      <FormModal open={open} title="Log backup action" submitLabel="Save log" onSubmit={handleSubmit} onOpenChange={setOpen}>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.backup_type} onChange={(e) => setForm({ ...form, backup_type: e.target.value })}>
            <option value="manual">Manual</option>
            <option value="scheduled">Scheduled</option>
            <option value="pre_migration">Pre-migration</option>
            <option value="legal_hold">Legal hold</option>
            <option value="shutdown">Shutdown</option>
            <option value="restore_test">Restore test</option>
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.backup_scope} onChange={(e) => setForm({ ...form, backup_scope: e.target.value })}>
            <option value="full_platform">Full platform</option>
            <option value="schema_only">Schema only</option>
            <option value="tenant_export">Tenant export</option>
            <option value="storage_only">Storage only</option>
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="planned">Planned</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
          </select>
          <Input type="date" value={form.retention_until} onChange={(e) => setForm({ ...form, retention_until: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Storage location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Checksum" value={form.checksum} onChange={(e) => setForm({ ...form, checksum: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </FormModal>
    </div>
  )
}
