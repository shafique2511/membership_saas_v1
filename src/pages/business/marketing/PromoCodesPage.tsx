import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { MarketingTabs } from './MarketingTabs'
import {
  createPromoCode,
  deletePromoCode,
  generatePromoCode,
  getMarketingTargetOptions,
  getPromoCodes,
  updatePromoCode,
  type MarketingTargetOption,
  type PromoCode,
} from '@/services/marketing'

function newPromoForm(): Partial<PromoCode> {
  return {
    code: generatePromoCode(),
    discount_type: 'percentage',
    discount_value: 0,
    usage_limit: 0,
    min_purchase: 0,
    applies_to: 'all',
    applicable_ids: [],
    member_only: false,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    is_active: true,
  }
}

export function PromoCodesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [targetOptions, setTargetOptions] = useState<MarketingTargetOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<PromoCode>>(newPromoForm())

  const load = useCallback(async () => {
    if (!businessId) return
    const [promoRows, options] = await Promise.all([getPromoCodes(businessId), getMarketingTargetOptions(businessId)])
    setPromos(promoRows)
    setTargetOptions(options)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function resetForm() {
    setForm(newPromoForm())
    setEditingId(null)
  }

  async function handleSave() {
    if (!form.code?.trim() || !form.start_date || !form.end_date) return
    const payload = {
      ...form,
      applicable_ids: form.applies_to === 'all' ? [] : form.applicable_ids ?? [],
    }
    if (editingId) await updatePromoCode(editingId, payload)
    else await createPromoCode(businessId, payload)
    resetForm()
    setShowForm(false)
    await load()
  }

  function handleEdit(promo: PromoCode) {
    setForm({ ...promo, applicable_ids: promo.applicable_ids ?? [], member_only: promo.member_only ?? false })
    setEditingId(promo.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    await deletePromoCode(id)
    await load()
  }

  async function handleToggleActive(id: string, current: boolean) {
    await updatePromoCode(id, { is_active: !current })
    await load()
  }

  const now = new Date().toISOString().slice(0, 10)
  const applicableOptions = targetOptions.filter((option) => form.applies_to !== 'all' && option.type === form.applies_to)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Promo Codes</h2>
          <p className="text-sm text-slate-500">Create discount, member-only, and item-specific promo codes.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>New promo code</Button>
      </div>
      <MarketingTabs />

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? 'Edit promo code' : 'New promo code'}</CardTitle></CardHeader>
          <CardContent className="max-w-xl space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Code" description="Promo code customers or staff enter at checkout.">
                <Input value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Discount type" description="How this promo reduces the final price.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="free_item">Free item</option>
                </select>
              </Field>
              <Field label={form.discount_type === 'percentage' ? 'Percentage' : 'Value'} description="Percentage uses 0 to 100; fixed discounts use currency value.">
                <Input type="number" value={form.discount_value ?? 0} onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))} />
              </Field>
              <Field label="Usage limit" description="Maximum total redemptions. Use 0 for unlimited.">
                <Input type="number" value={form.usage_limit ?? 0} onChange={(e) => setForm((f) => ({ ...f, usage_limit: Number(e.target.value) }))} />
              </Field>
              <Field label="Minimum purchase" description="Minimum order amount required before this promo can apply.">
                <Input type="number" value={form.min_purchase ?? 0} onChange={(e) => setForm((f) => ({ ...f, min_purchase: Number(e.target.value) }))} />
              </Field>
              <Field label="Applies to" description="Which item type can use this promo code.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.applies_to} onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value, applicable_ids: [] }))}>
                  <option value="all">All items</option>
                  <option value="service">Services</option>
                  <option value="product">Products</option>
                  <option value="membership">Memberships</option>
                </select>
              </Field>
              <Field label="Start date" description="First date this promo can be used.">
                <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </Field>
              <Field label="End date" description="Last date this promo can be used.">
                <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </Field>
            </div>
            <Field label="Specific items" description="Optional. Leave empty to allow all items in the selected item type.">
              <select
                multiple
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.applicable_ids ?? []}
                disabled={form.applies_to === 'all'}
                onChange={(e) => setForm((f) => ({ ...f, applicable_ids: Array.from(e.target.selectedOptions).map((option) => option.value) }))}
              >
                {applicableOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </Field>
            <Field label="Description" description="Optional internal note explaining this promotion.">
              <Input value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <div className="flex items-start gap-2">
              <input type="checkbox" id="promo_member_only" checked={form.member_only ?? false} onChange={(e) => setForm((f) => ({ ...f, member_only: e.target.checked }))} className="mt-1 rounded border-gray-300" />
              <label htmlFor="promo_member_only" className="text-sm">
                <span className="font-medium">Member-only promo</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Requires a selected customer/member before this promo can be redeemed.</span>
              </label>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" id="promo_active" checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="mt-1 rounded border-gray-300" />
              <label htmlFor="promo_active" className="text-sm">
                <span className="font-medium">Active</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Inactive promo codes cannot be redeemed even if dates are valid.</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All promo codes</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Discount</th>
                  <th className="pb-2 font-medium">Usage</th>
                  <th className="pb-2 font-medium">Applies To</th>
                  <th className="pb-2 font-medium">Valid</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => {
                  const valid = promo.start_date <= now && promo.end_date >= now
                  return (
                    <tr key={promo.id} className="border-b last:border-0">
                      <td className="py-2 font-mono font-bold">{promo.code}</td>
                      <td className="py-2">{promo.discount_type === 'percentage' ? `${promo.discount_value}%` : promo.discount_type === 'fixed' ? `RM ${promo.discount_value}` : 'Free item'}</td>
                      <td className="py-2">{promo.used_count}/{promo.usage_limit || 'unlimited'}</td>
                      <td className="py-2 capitalize">{promo.member_only ? 'Members only' : promo.applies_to.replace(/_/g, ' ')}</td>
                      <td className="py-2">{valid ? `${promo.start_date} to ${promo.end_date}` : 'Expired'}</td>
                      <td className="py-2"><Badge variant={promo.is_active ? 'default' : 'muted'}>{promo.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(promo)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleActive(promo.id, promo.is_active)}>{promo.is_active ? 'Deactivate' : 'Activate'}</Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(promo.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {promos.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No promo codes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
