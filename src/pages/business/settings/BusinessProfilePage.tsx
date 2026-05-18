import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getBusiness, updateBusiness, type Business } from '@/services/businessSettings'
import { SettingsTabs } from './SettingsTabs'

const businessTypes = ['barber_shop', 'coffee_shop', 'salon', 'spa', 'clinic', 'event_space', 'custom'] as const

export function BusinessProfilePage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [form, setForm] = useState<Partial<Business>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const b = await getBusiness(businessId)
    if (b) setForm(b)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSave() {
    setSaving(true)
    await updateBusiness(businessId, form)
    setSaving(false)
  }

  function set<K extends keyof Business>(key: K, value: Business[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Business profile</h2>
        <p className="text-sm text-slate-500">Manage your business name, contact info, and preferences.</p>
      </div>
      <SettingsTabs />
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Business name" description="Shown on the dashboard, receipts, booking pages, and customer portal.">
            <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Business type" description="Used for business labels and module workflow defaults. It does not remove existing data.">
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.business_type ?? ''}
              onChange={(e) => set('business_type', e.target.value as Business['business_type'])}
            >
              <option value="">Select type</option>
              {businessTypes.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" description="Main phone number customers can use to contact the business.">
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="WhatsApp" description="Optional WhatsApp number for customer communication links.">
              <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
            </Field>
          </div>
          <Field label="Email" description="Main business email shown to customers and used for support contact.">
            <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Address" description="Primary business address used for booking and customer-facing pages.">
            <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Timezone" description="Controls booking dates, business hours, reports, and notification timing.">
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.timezone ?? 'Asia/Kuala_Lumpur'}
              onChange={(e) => set('timezone', e.target.value as Business['timezone'])}
            >
              {['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
      </div>
    </div>
  )
}
