import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { PaymentsTabs } from './PaymentsTabs'
import { getPaymentSettings, PAYMENT_METHODS, upsertPaymentSettings, type PaymentSettings } from '@/services/payments'
import { toastError, toastSuccess } from '@/lib/toast'

const allMethods = [...PAYMENT_METHODS]

export function PaymentSettingsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [form, setForm] = useState<Partial<PaymentSettings>>({
    enabled_methods: ['cash', 'qr', 'card', 'bank_transfer'],
    invoice_prefix: 'INV-',
    receipt_prefix: 'RCP-',
    payment_terms_days: 30,
    deposit_percentage: 50,
    require_proof_for: ['bank_transfer'],
    auto_verify_online: true,
    gateway_stripe: { enabled: false },
    gateway_billplz: { enabled: false },
    gateway_toyyibpay: { enabled: false },
    gateway_senangpay: { enabled: false },
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getPaymentSettings(businessId)
    if (s) setForm(s)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const toggleMethod = (method: string) => {
    const current = form.enabled_methods as string[] ?? []
    const next = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method]
    setForm((f) => ({ ...f, enabled_methods: next }))
  }

  const toggleProof = (method: string) => {
    const current = form.require_proof_for as string[] ?? []
    const next = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method]
    setForm((f) => ({ ...f, require_proof_for: next }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await upsertPaymentSettings(businessId, form)
      toastSuccess('Payment settings saved')
    } catch (error) {
      toastError(error, 'Failed to save payment settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payment Settings</h2>
        <p className="text-sm text-slate-500">Configure payment methods, gateways, and preferences.</p>
      </div>
      <PaymentsTabs />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {allMethods.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(form.enabled_methods as string[] ?? []).includes(m)}
                  onChange={() => toggleMethod(m)}
                  className="rounded border-gray-300"
                />
                <span className="capitalize">{m.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gateway Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              { key: 'gateway_stripe', label: 'Stripe' },
              { key: 'gateway_billplz', label: 'Billplz' },
              { key: 'gateway_toyyibpay', label: 'ToyyibPay' },
              { key: 'gateway_senangpay', label: 'SenangPay' },
            ].map((gw) => (
              <div key={gw.key} className="flex items-center justify-between">
                <span>{gw.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sandbox</span>
                  <input
                    type="checkbox"
                    checked={(form[gw.key as keyof PaymentSettings] as { enabled?: boolean })?.enabled ?? false}
                    onChange={() => {
                      const current = form[gw.key as keyof PaymentSettings] as { enabled?: boolean } ?? {}
                      setForm((f) => ({ ...f, [gw.key]: { ...current, enabled: !current.enabled } }))
                    }}
                    className="rounded border-gray-300"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Invoice prefix" description="Text added before generated invoice numbers.">
              <Input value={form.invoice_prefix ?? 'INV-'} onChange={(e) => setForm((f) => ({ ...f, invoice_prefix: e.target.value }))} />
            </Field>
            <Field label="Receipt prefix" description="Text added before generated receipt numbers.">
              <Input value={form.receipt_prefix ?? 'RCP-'} onChange={(e) => setForm((f) => ({ ...f, receipt_prefix: e.target.value }))} />
            </Field>
            <Field label="Payment terms" description="Number of days before unpaid invoices become due.">
              <Input type="number" value={form.payment_terms_days ?? 30} onChange={(e) => setForm((f) => ({ ...f, payment_terms_days: Number(e.target.value) }))} />
            </Field>
            <Field label="Deposit percentage" description="Default deposit percentage for bookings or payable records that require deposits.">
              <Input type="number" value={form.deposit_percentage ?? 50} onChange={(e) => setForm((f) => ({ ...f, deposit_percentage: Number(e.target.value) }))} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Verification Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Methods requiring proof upload:</p>
            {['bank_transfer', 'cash', 'credit', 'points'].map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(form.require_proof_for as string[] ?? []).includes(m)}
                  onChange={() => toggleProof(m)}
                  className="rounded border-gray-300"
                />
                <span className="capitalize">{m.replace(/_/g, ' ')}</span>
              </label>
            ))}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="auto_verify"
                checked={form.auto_verify_online ?? true}
                onChange={(e) => setForm((f) => ({ ...f, auto_verify_online: e.target.checked }))}
                className="mt-1 rounded border-gray-300"
              />
              <label htmlFor="auto_verify" className="text-sm">
                <span className="font-medium">Auto-verify online payments</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Marks supported online gateway payments as verified after successful gateway confirmation.</span>
              </label>
            </div>
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
