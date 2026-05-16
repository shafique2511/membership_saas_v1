import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NotificationTabs } from './NotificationTabs'
import { getChannelSettings, upsertChannelSettings, type ChannelSettings } from '@/services/notifications'

const channelLabels: Record<string, string> = {
  email: 'Email (SMTP)',
  whatsapp: 'WhatsApp API',
  telegram: 'Telegram Bot',
  sms: 'SMS Gateway',
}

const defaultConfigs: Record<string, Record<string, string>> = {
  email: { smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', from_address: '' },
  whatsapp: { api_url: '', api_key: '', phone_number_id: '' },
  telegram: { bot_token: '', chat_id: '' },
  sms: { provider: '', api_key: '', sender_id: '' },
}

export function NotificationSettingsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [settings, setSettings] = useState<ChannelSettings[]>([])
  const [editingChannel, setEditingChannel] = useState<string | null>(null)
  const [editConfig, setEditConfig] = useState<Record<string, string>>({})
  const [editEnabled, setEditEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getChannelSettings(businessId)
    setSettings(s)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function startEdit(channel: string) {
    const existing = settings.find((s) => s.channel === channel)
    setEditingChannel(channel)
    setEditConfig((existing?.config as Record<string, string>) ?? defaultConfigs[channel] ?? {})
    setEditEnabled(existing?.is_enabled ?? false)
  }

  async function handleSave() {
    if (!editingChannel) return
    setSaving(true)
    await upsertChannelSettings(businessId, editingChannel, editConfig, editEnabled)
    setSaving(false)
    setEditingChannel(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notification Settings</h2>
        <p className="text-sm text-slate-500">Configure email, WhatsApp, Telegram, and SMS channels.</p>
      </div>
      <NotificationTabs />
      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(channelLabels).map(([channel, label]) => {
          const existing = settings.find((s) => s.channel === channel)
          return (
            <Card key={channel}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{label}</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${existing?.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {existing?.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {editingChannel === channel ? (
                  <div className="space-y-3">
                    {Object.entries(editConfig).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                        <Input
                          type={key.includes('pass') || key.includes('key') || key.includes('token') ? 'password' : 'text'}
                          value={val}
                          onChange={(e) => setEditConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} className="rounded border-gray-300" />
                      Enable this channel
                    </label>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditingChannel(null)}>Cancel</Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {existing ? (
                      Object.entries(existing.config as Record<string, string>).slice(0, 3).map(([key, val]) => (
                        <p key={key} className="text-xs text-muted-foreground">
                          <span className="capitalize">{key.replace(/_/g, ' ')}: </span>
                          {key.includes('pass') || key.includes('key') || key.includes('token') ? '••••••••' : val || '-'}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Not configured</p>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEdit(channel)} className="mt-2">
                      {existing ? 'Edit configuration' : 'Configure'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
