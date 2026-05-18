import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getPlatformSettings, savePlatformSettings, type PlatformSettings } from '@/services/admin'

export function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    trial_days: 14,
    currency: 'MYR',
    default_timezone: 'Asia/Kuala_Lumpur',
    allow_owner_registration: true,
    require_module_access_checks: true,
    track_usage_limits: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void getPlatformSettings().then((data) => {
      if (data) setSettings(data)
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await savePlatformSettings(settings)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description="Global defaults for billing, trials, support, and platform behavior." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Billing defaults</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Default trial days" description="Number of trial days applied when a package starts with trial access.">
              <Input
                type="number"
                placeholder="14"
                value={settings.trial_days}
                onChange={(event) => setSettings({ ...settings, trial_days: Number(event.target.value) })}
              />
            </Field>
            <Field label="Currency" description="Default ISO currency code used for platform prices and billing displays.">
              <Input
                placeholder="MYR"
                value={settings.currency}
                onChange={(event) => setSettings({ ...settings, currency: event.target.value })}
              />
            </Field>
            <Field label="Default timezone" description="Fallback timezone used when a business has not set its own timezone.">
              <Input
                placeholder="Asia/Kuala_Lumpur"
                value={settings.default_timezone}
                onChange={(event) => setSettings({ ...settings, default_timezone: event.target.value })}
              />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Platform controls</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={settings.allow_owner_registration} onChange={(event) => setSettings({ ...settings, allow_owner_registration: event.target.checked })} />
              <span><span className="font-medium">Allow owner self-registration</span><span className="block text-xs text-slate-500 dark:text-slate-400">When enabled, new business owners can create accounts without admin creation.</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={settings.require_module_access_checks} onChange={(event) => setSettings({ ...settings, require_module_access_checks: event.target.checked })} />
              <span><span className="font-medium">Require module access checks</span><span className="block text-xs text-slate-500 dark:text-slate-400">Blocks disabled or unpurchased modules in frontend and backend logic.</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={settings.track_usage_limits} onChange={(event) => setSettings({ ...settings, track_usage_limits: event.target.checked })} />
              <span><span className="font-medium">Track usage limits</span><span className="block text-xs text-slate-500 dark:text-slate-400">Enforces package limits such as branches, staff, customers, and bookings.</span></span>
            </label>
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save all settings'}</Button>
    </div>
  )
}
