import { useEffect, useState } from 'react'
import { Database, Download, FileArchive, ShieldCheck } from 'lucide-react'
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
  createPlatformBackupRequest,
  listBackupDownloads,
  listBackupRequests,
  listBusinesses,
  recordBackupDownload,
} from '@/services/admin'

export function BackupHistoryPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [downloads, setDownloads] = useState<Record<string, unknown>[]>([])
  const [businesses, setBusinesses] = useState<Record<string, unknown>[]>([])
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [requestType, setRequestType] = useState('full_platform')
  const [businessId, setBusinessId] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [twoFactorConfirmed, setTwoFactorConfirmed] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [nextRows, nextDownloads, nextBusinesses] = await Promise.all([
      listBackupRequests(),
      listBackupDownloads(),
      listBusinesses(),
    ])
    setRows(nextRows as Record<string, unknown>[])
    setDownloads(nextDownloads as Record<string, unknown>[])
    setBusinesses(nextBusinesses as unknown as Record<string, unknown>[])
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch(() => setRows([])), 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleCreate() {
    setError('')
    if (!reason.trim()) {
      setError('Backup reason is required.')
      return
    }
    if (passwordConfirmation !== 'CONFIRM') {
      setError('Type CONFIRM to acknowledge password confirmation before creating a backup request.')
      return
    }
    if (requestType === 'single_business' && !businessId) {
      setError('Choose a business for a single business backup.')
      return
    }
    await createPlatformBackupRequest({
      request_type: requestType,
      reason,
      business_id: requestType === 'single_business' ? businessId : null,
      password_confirmed: true,
      two_factor_confirmed: twoFactorConfirmed,
    })
    setOpen(false)
    setReason('')
    setBusinessId('')
    setPasswordConfirmation('')
    setTwoFactorConfirmed(false)
    await load()
  }

  async function handleTrackDownload(id: unknown) {
    if (!id) return
    await recordBackupDownload(String(id))
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & migration"
        description="Full platform, single business, database, storage, migration, legal, and shutdown backup requests."
        actions={<Button onClick={() => setOpen(true)}>Create backup request</Button>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Super admin only</p>
              <p className="text-xs text-slate-500">Platform backups are not exposed to normal users.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <FileArchive className="h-5 w-5 text-sky-600" />
            <div>
              <p className="text-sm font-medium">Expiring links</p>
              <p className="text-xs text-slate-500">Ready backups should use signed URLs with expiry.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Database className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-sm font-medium">Audit trail</p>
              <p className="text-xs text-slate-500">Every request and download is logged.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Backup requests</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <DataTable
            columns={[
              { key: 'request_type', header: 'Type', render: (row) => <Badge>{String(row.request_type)}</Badge> },
              { key: 'scope', header: 'Scope' },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
              { key: 'reason', header: 'Reason', render: (row) => String(row.reason ?? '-') },
              { key: 'download_count', header: 'Downloads', render: (row) => String(row.download_count ?? 0) },
              { key: 'encryption_status', header: 'Encryption', render: (row) => String(row.encryption_status ?? '-') },
              { key: 'created_at', header: 'Created', render: (row) => new Date(String(row.created_at)).toLocaleString() },
              { key: 'expires_at', header: 'Expires', render: (row) => row.expires_at ? new Date(String(row.expires_at)).toLocaleString() : '-' },
              {
                key: 'id',
                header: 'Downloads',
                render: (row) => (
                  <Button size="sm" variant="outline" onClick={() => void handleTrackDownload(row.id)}>
                    <Download className="h-3.5 w-3.5" />
                    Track
                  </Button>
                ),
              },
            ]}
            data={rows}
            emptyMessage="No backup requests yet."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Backup downloads</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'backup_request_id', header: 'Backup request' },
              { key: 'business_id', header: 'Business' },
              { key: 'downloaded_by', header: 'Downloaded by' },
              { key: 'signed_url_expires_at', header: 'Signed URL expires', render: (row) => row.signed_url_expires_at ? new Date(String(row.signed_url_expires_at)).toLocaleString() : '-' },
              { key: 'created_at', header: 'Downloaded', render: (row) => new Date(String(row.created_at)).toLocaleString() },
            ]}
            data={downloads}
            emptyMessage="No tracked downloads yet."
          />
        </CardContent>
      </Card>

      <FormModal open={open} title="Create backup request" submitLabel="Create request" onSubmit={handleCreate} onOpenChange={setOpen}>
        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <Field label="Backup type" description="Choose why the platform backup is being prepared.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
              <option value="full_platform">Full platform</option>
              <option value="single_business">Single business</option>
              <option value="database">Database</option>
              <option value="storage">File storage</option>
              <option value="migration">Migration</option>
              <option value="shutdown">Shutdown</option>
            </select>
          </Field>
          {requestType === 'single_business' && (
            <Field label="Business" description="Business A and Business B backups remain tenant-scoped.">
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
                <option value="">Select business</option>
                {businesses.map((business) => (
                  <option key={String(business.id)} value={String(business.id)}>{String(business.name)}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Reason" description="Required audit context for backup creation.">
            <Input required placeholder="Disaster recovery test, migration, legal request..." value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <Field label="Password confirmation" description="Type CONFIRM after confirming your password or privileged session outside this browser workflow.">
            <Input required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={twoFactorConfirmed} onChange={(event) => setTwoFactorConfirmed(event.target.checked)} />
            <span>2FA confirmation completed where enabled</span>
          </label>
        </div>
      </FormModal>
    </div>
  )
}
