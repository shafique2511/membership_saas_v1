import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
            <Input
              type="number"
              placeholder="Default trial days"
              value={settings.trial_days}
              onChange={(event) => setSettings({ ...settings, trial_days: Number(event.target.value) })}
            />
            <Input
              placeholder="Currency"
              value={settings.currency}
              onChange={(event) => setSettings({ ...settings, currency: event.target.value })}
            />
            <Input
              placeholder="Default timezone"
              value={settings.default_timezone}
              onChange={(event) => setSettings({ ...settings, default_timezone: event.target.value })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Platform controls</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.allow_owner_registration} onChange={(event) => setSettings({ ...settings, allow_owner_registration: event.target.checked })} />
              Allow owner self-registration
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.require_module_access_checks} onChange={(event) => setSettings({ ...settings, require_module_access_checks: event.target.checked })} />
              Require module access checks
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.track_usage_limits} onChange={(event) => setSettings({ ...settings, track_usage_limits: event.target.checked })} />
              Track usage limits
            </label>
          </CardContent>
        </Card>
      </div>
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save all settings'}</Button>
    </div>
  )
}
