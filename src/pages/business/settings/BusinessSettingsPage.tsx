import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getBusiness, updateBusiness, type Business } from '@/services/businessSettings'
import { Paintbrush } from 'lucide-react'

const businessTypes = ['barber_shop', 'coffee_shop', 'salon', 'spa', 'clinic', 'event_space', 'custom'] as const

export function BusinessSettingsPage() {
  const { profile, hasModule } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [form, setForm] = useState<Partial<Business>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const b = await getBusiness(businessId)
    if (b) setForm(b)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

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
        <h2 className="text-lg font-semibold">Business Settings</h2>
        <p className="text-sm text-slate-500">Manage your business profile and preferences.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Business name" description="Shown on receipts, booking pages, customer portal, and internal dashboards.">
              <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Business type" description="Used for business-specific labels and workflows. Modules remain controlled separately.">
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
            <Field label="Phone" description="Main contact number shown to customers.">
              <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="WhatsApp" description="Optional WhatsApp contact number for customer communication.">
              <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
            </Field>
            <Field label="Email" description="Business email used for customer contact and notices.">
              <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Address" description="Primary location shown in customer-facing business details.">
              <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Timezone" description="Used for booking slots, reports, business hours, and notifications.">
              <Input value={form.timezone ?? ''} onChange={(e) => set('timezone', e.target.value)} />
            </Field>
          </CardContent>
        </Card>
        {hasModule('booking') && (
          <Card>
            <CardHeader><CardTitle>Booking Rules</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">Booking rules can be configured from the Bookings module.</p>
            </CardContent>
          </Card>
        )}
        <Link to="/business/settings/white-label">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader><CardTitle className="flex items-center gap-2"><Paintbrush className="h-4 w-4" /> White label</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Custom brand name, logo, colors, and domain settings.</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader><CardTitle>Subscription</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">View and manage your subscription from the Business dashboard.</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}
