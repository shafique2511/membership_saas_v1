import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
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
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={form.auto_expiry} onChange={(e) => setForm({ ...form, auto_expiry: e.target.checked })} />
              <span><span className="font-medium">Auto-expire memberships</span><span className="block text-xs text-slate-500 dark:text-slate-400">Automatically marks memberships expired after their end date and grace period.</span></span>
            </label>
            <Field label="Reminder days before expiry" description="Comma-separated days before expiry when reminders should be sent.">
              <Input value={(form.reminder_days_before ?? []).join(', ')} onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value.split(',').map(Number).filter((n) => !isNaN(n)) })} placeholder="7, 3, 1" />
            </Field>
            <Field label="Grace period" description="Extra days after expiry before access is fully blocked.">
              <Input type="number" value={form.grace_period_days} onChange={(e) => setForm({ ...form, grace_period_days: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Freeze policy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={form.allow_freeze} onChange={(e) => setForm({ ...form, allow_freeze: e.target.checked })} />
              <span><span className="font-medium">Allow membership freeze</span><span className="block text-xs text-slate-500 dark:text-slate-400">Lets staff pause memberships for holidays, medical leave, or other approved reasons.</span></span>
            </label>
            {form.allow_freeze && (
              <>
                <Field label="Max freeze days" description="Maximum number of days a membership can be frozen at one time.">
                  <Input type="number" value={form.max_freeze_days} onChange={(e) => setForm({ ...form, max_freeze_days: Number(e.target.value) })} />
                </Field>
                <Field label="Freeze cooldown" description="Number of days before the same customer can freeze again.">
                  <Input type="number" value={form.freeze_cooldown_days} onChange={(e) => setForm({ ...form, freeze_cooldown_days: Number(e.target.value) })} />
                </Field>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Transfer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={form.allow_transfer} onChange={(e) => setForm({ ...form, allow_transfer: e.target.checked })} />
              <span><span className="font-medium">Allow membership transfer</span><span className="block text-xs text-slate-500 dark:text-slate-400">Allows a membership balance or entitlement to move from one customer to another.</span></span>
            </label>
            {form.allow_transfer && (
              <Field label="Transfer fee" description="Fixed amount charged when transferring a membership.">
                <Input type="number" value={form.transfer_fee} onChange={(e) => setForm({ ...form, transfer_fee: Number(e.target.value) })} />
              </Field>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Renewal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Default renewal behavior" description="What happens when a membership reaches renewal time.">
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:bg-slate-900" value={form.default_renewal_behavior} onChange={(e) => setForm({ ...form, default_renewal_behavior: e.target.value })}>
                <option value="manual">Manual renewal</option>
                <option value="reminder">Send reminder only</option>
                <option value="auto">Auto-renew</option>
              </select>
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" checked={form.pro_rated_renewal} onChange={(e) => setForm({ ...form, pro_rated_renewal: e.target.checked })} />
              <span><span className="font-medium">Pro-rated renewal pricing</span><span className="block text-xs text-slate-500 dark:text-slate-400">Adjusts renewal charge based on remaining time or partial-period changes.</span></span>
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
