import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
          <div className="space-y-1">
            <label className="text-sm font-medium">Business name</label>
            <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Business type</label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">WhatsApp</label>
              <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Address</label>
            <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Timezone</label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.timezone ?? 'Asia/Kuala_Lumpur'}
              onChange={(e) => set('timezone', e.target.value as Business['timezone'])}
            >
              {['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
      </div>
    </div>
  )
}
