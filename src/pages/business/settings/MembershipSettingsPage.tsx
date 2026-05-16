import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getMembershipSettings, upsertMembershipSettings, type MembershipSettings } from '@/services/settings'
import { SettingsTabs } from './SettingsTabs'

export function MembershipSettingsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [form, setForm] = useState<Partial<MembershipSettings>>({
    auto_expiry: true, reminder_days_before: [7, 3, 1], allow_freeze: true,
    max_freeze_days: 30, freeze_cooldown_days: 90, allow_transfer: false,
    transfer_fee: 0, default_renewal_behavior: 'manual', pro_rated_renewal: false, grace_period_days: 7,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getMembershipSettings(businessId)
    if (s) setForm(s)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSave() {
    setSaving(true)
    await upsertMembershipSettings(businessId, form)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Membership settings</h2>
        <p className="text-sm text-slate-500">Configure expiry, freeze, transfer, and renewal behavior.</p>
      </div>
      <SettingsTabs />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Expiry & reminders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_expiry} onChange={(e) => setForm({ ...form, auto_expiry: e.target.checked })} />
              Auto-expire memberships
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Reminder days before expiry</label>
              <Input value={(form.reminder_days_before ?? []).join(', ')} onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value.split(',').map(Number).filter((n) => !isNaN(n)) })} placeholder="7, 3, 1" />
              <p className="mt-1 text-[10px] text-slate-400">Comma-separated list of days</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Grace period (days)</label>
              <Input type="number" value={form.grace_period_days} onChange={(e) => setForm({ ...form, grace_period_days: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Freeze policy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allow_freeze} onChange={(e) => setForm({ ...form, allow_freeze: e.target.checked })} />
              Allow membership freeze
            </label>
            {form.allow_freeze && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Max freeze days</label>
                  <Input type="number" value={form.max_freeze_days} onChange={(e) => setForm({ ...form, max_freeze_days: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Freeze cooldown (days)</label>
                  <Input type="number" value={form.freeze_cooldown_days} onChange={(e) => setForm({ ...form, freeze_cooldown_days: Number(e.target.value) })} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transfer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allow_transfer} onChange={(e) => setForm({ ...form, allow_transfer: e.target.checked })} />
              Allow membership transfer
            </label>
            {form.allow_transfer && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Transfer fee (RM)</label>
                <Input type="number" value={form.transfer_fee} onChange={(e) => setForm({ ...form, transfer_fee: Number(e.target.value) })} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Renewal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Default renewal behavior</label>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:bg-slate-900" value={form.default_renewal_behavior} onChange={(e) => setForm({ ...form, default_renewal_behavior: e.target.value })}>
                <option value="manual">Manual renewal</option>
                <option value="reminder">Send reminder only</option>
                <option value="auto">Auto-renew</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.pro_rated_renewal} onChange={(e) => setForm({ ...form, pro_rated_renewal: e.target.checked })} />
              Pro-rated renewal pricing
            </label>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</Button>
      </div>
    </div>
  )
}
