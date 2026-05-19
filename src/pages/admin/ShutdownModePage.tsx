import { useEffect, useState } from 'react'
import { FileArchive, Mail } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import {
  createPlatformBackupRequest,
  getShutdownSettings,
  listShutdownBackupTracking,
  queueShutdownOwnerNotices,
  saveShutdownSettings,
  type ShutdownSettingsRow,
} from '@/services/admin'

const defaultSettings: ShutdownSettingsRow = {
  id: '',
  status: 'normal',
  notice_enabled: false,
  shutdown_date: null,
  export_deadline: null,
  support_email: '',
  disable_new_business_registration: false,
  disable_new_subscription_purchases: false,
  owner_only_login_after_shutdown: false,
  notice_message: 'Luxantara Members is operating normally.',
  updated_at: '',
}

export function ShutdownModePage() {
  const [settings, setSettings] = useState<ShutdownSettingsRow>(defaultSettings)
  const [tracking, setTracking] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [noticeCount, setNoticeCount] = useState<number | null>(null)
  const [finalBackupReason, setFinalBackupReason] = useState('Planned shutdown final backup')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([getShutdownSettings(), listShutdownBackupTracking()])
        .then(([data, rows]) => {
          if (data) setSettings(data)
          setTracking(rows as Record<string, unknown>[])
        })
        .catch(() => {})
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      setSettings(await saveShutdownSettings(settings))
    } finally {
      setSaving(false)
    }
  }

  async function handleQueueNotices() {
    setError('')
    try {
      setNoticeCount(await queueShutdownOwnerNotices())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleFinalBackup() {
    setError('')
    if (confirmation !== 'CONFIRM') {
      setError('Type CONFIRM before generating the final platform backup request.')
      return
    }
    try {
      await createPlatformBackupRequest({
        request_type: 'shutdown',
        reason: finalBackupReason,
        password_confirmed: true,
        two_factor_confirmed: true,
      })
      setConfirmation('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Shutdown mode" description="Set platform shutdown status, notices, registration blocks, and export deadlines." />
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      <Card>
        <CardHeader><CardTitle>Shutdown controls</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Field label="Shutdown status" description="Controls platform-wide shutdown behavior and owner export mode.">
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={settings.status} onChange={(event) => setSettings({ ...settings, status: event.target.value as ShutdownSettingsRow['status'] })}>
              <option value="normal">Normal</option>
              <option value="planned_shutdown">Planned shutdown</option>
              <option value="export_only">Export only</option>
              <option value="fully_shutdown">Fully shutdown</option>
            </select>
          </Field>
          <Field label="Support email" description="Email shown to business owners during shutdown notices.">
            <Input value={settings.support_email ?? ''} onChange={(event) => setSettings({ ...settings, support_email: event.target.value })} />
          </Field>
          <Field label="Shutdown date" description="Date and time when normal service is expected to stop.">
            <Input type="datetime-local" value={settings.shutdown_date?.slice(0, 16) ?? ''} onChange={(event) => setSettings({ ...settings, shutdown_date: event.target.value || null })} />
          </Field>
          <Field label="Export deadline" description="Final date and time owners can export their business data.">
            <Input type="datetime-local" value={settings.export_deadline?.slice(0, 16) ?? ''} onChange={(event) => setSettings({ ...settings, export_deadline: event.target.value || null })} />
          </Field>
          <Field className="lg:col-span-2" label="Notice message" description="Banner text shown to business owners when notices are enabled.">
            <Input value={settings.notice_message ?? ''} onChange={(event) => setSettings({ ...settings, notice_message: event.target.value })} />
          </Field>
          {[
            ['notice_enabled', 'Enable shutdown notice banner'],
            ['disable_new_business_registration', 'Disable new business registration'],
            ['disable_new_subscription_purchases', 'Disable new subscription purchases'],
            ['owner_only_login_after_shutdown', 'Allow owner-only login after shutdown'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={Boolean(settings[key as keyof ShutdownSettingsRow])} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} />
              <span>{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save shutdown settings'}</Button>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Owner notices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Queue a notice record for each business owner. Email delivery should be handled by the platform notification worker.
            </p>
            <Button onClick={() => void handleQueueNotices()}>Send notice to all business owners</Button>
            {noticeCount !== null && <p className="text-sm text-slate-500">{noticeCount} notice records queued or refreshed.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileArchive className="h-4 w-4" />
              Final platform backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Backup reason">
              <Input value={finalBackupReason} onChange={(event) => setFinalBackupReason(event.target.value)} />
            </Field>
            <Field label="Password confirmation">
              <Input placeholder="Type CONFIRM" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </Field>
            <Button onClick={() => void handleFinalBackup()}>Generate final platform backup</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-business backup tracking</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'business_id', header: 'Business' },
              { key: 'backup_request_id', header: 'Backup request' },
              { key: 'status', header: 'Status' },
              { key: 'generated_at', header: 'Generated', render: (row) => row.generated_at ? new Date(String(row.generated_at)).toLocaleString() : '-' },
              { key: 'downloaded_at', header: 'Downloaded', render: (row) => row.downloaded_at ? new Date(String(row.downloaded_at)).toLocaleString() : '-' },
            ]}
            data={tracking}
            emptyMessage="No shutdown backup tracking records yet."
          />
        </CardContent>
      </Card>
    </div>
  )
}
