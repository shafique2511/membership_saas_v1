import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getBookingRules, upsertBookingRules, type BookingRules } from '@/services/settings'
import { SettingsTabs } from './SettingsTabs'

export function BookingRulesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [form, setForm] = useState<Partial<BookingRules>>({
    slot_duration_minutes: 60, buffer_time_minutes: 0, min_booking_notice_hours: 1,
    max_advance_days: 30, auto_confirm: false, deposit_required: false,
    deposit_percentage: 0, cancellation_policy: 'free', cancellation_fee_amount: 0,
    allow_walk_in: true, max_guests_per_booking: 1,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getBookingRules(businessId)
    if (r) setForm(r)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSave() {
    setSaving(true)
    await upsertBookingRules(businessId, form)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Booking rules</h2>
        <p className="text-sm text-slate-500">Configure slot duration, notice periods, deposits, and cancellation policy.</p>
      </div>
      <SettingsTabs />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Scheduling</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Slot duration" description="Default appointment length in minutes when a service does not override it.">
              <Input type="number" value={form.slot_duration_minutes} onChange={(e) => setForm({ ...form, slot_duration_minutes: Number(e.target.value) })} />
            </Field>
            <Field label="Buffer time between slots" description="Extra minutes blocked after each booking for cleanup, prep, or travel.">
              <Input type="number" value={form.buffer_time_minutes} onChange={(e) => setForm({ ...form, buffer_time_minutes: Number(e.target.value) })} />
            </Field>
            <Field label="Minimum booking notice" description="How many hours in advance customers must book.">
              <Input type="number" value={form.min_booking_notice_hours} onChange={(e) => setForm({ ...form, min_booking_notice_hours: Number(e.target.value) })} />
            </Field>
            <Field label="Maximum advance booking" description="How far into the future customers can book.">
              <Input type="number" value={form.max_advance_days} onChange={(e) => setForm({ ...form, max_advance_days: Number(e.target.value) })} />
            </Field>
            <Field label="Max guests per booking" description="Largest party size allowed for one booking. Use 1 for normal appointments.">
              <Input type="number" value={form.max_guests_per_booking} onChange={(e) => setForm({ ...form, max_guests_per_booking: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Confirmation & deposits</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input className="mt-1" type="checkbox" checked={form.auto_confirm} onChange={(e) => setForm({ ...form, auto_confirm: e.target.checked })} />
                <span><span className="font-medium">Auto-confirm bookings</span><span className="block text-xs text-slate-500 dark:text-slate-400">New bookings become confirmed automatically instead of waiting for staff approval.</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input className="mt-1" type="checkbox" checked={form.deposit_required} onChange={(e) => setForm({ ...form, deposit_required: e.target.checked })} />
                <span><span className="font-medium">Require deposit</span><span className="block text-xs text-slate-500 dark:text-slate-400">Customers must pay a deposit before the booking is accepted.</span></span>
              </label>
              {form.deposit_required && (
                <Field label="Deposit percentage" description="Percentage of booking total collected as deposit.">
                  <Input type="number" min="0" max="100" value={form.deposit_percentage} onChange={(e) => setForm({ ...form, deposit_percentage: Number(e.target.value) })} />
                </Field>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input className="mt-1" type="checkbox" checked={form.allow_walk_in} onChange={(e) => setForm({ ...form, allow_walk_in: e.target.checked })} />
                <span><span className="font-medium">Allow walk-in bookings</span><span className="block text-xs text-slate-500 dark:text-slate-400">Staff can create bookings for customers who arrive without online booking.</span></span>
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cancellation policy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Policy" description="Controls whether customers can cancel and whether a fee applies.">
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:bg-slate-900" value={form.cancellation_policy} onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}>
                  <option value="free">Free cancellation</option>
                  <option value="fee">Cancellation fee</option>
                  <option value="strict">Strict (no refund)</option>
                  <option value="none">No cancellation</option>
                </select>
              </Field>
              {form.cancellation_policy === 'fee' && (
                <Field label="Fee amount" description="Fixed cancellation fee charged when the policy is set to fee.">
                  <Input type="number" value={form.cancellation_fee_amount} onChange={(e) => setForm({ ...form, cancellation_fee_amount: Number(e.target.value) })} />
                </Field>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save rules'}</Button>
      </div>
    </div>
  )
}
