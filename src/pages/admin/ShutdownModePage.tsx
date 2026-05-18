import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getShutdownSettings, saveShutdownSettings, type ShutdownSettingsRow } from '@/services/admin'

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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getShutdownSettings().then((data) => data && setSettings(data)).catch(() => {})
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

  return (
    <div className="space-y-6">
      <PageHeader title="Shutdown mode" description="Set platform shutdown status, notices, registration blocks, and export deadlines." />
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
    </div>
  )
}
