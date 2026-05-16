import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MarketingTabs } from './MarketingTabs'
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, generatePromoCode, type PromoCode } from '@/services/marketing'

export function PromoCodesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<PromoCode>>({
    code: '', discount_type: 'percentage', discount_value: 0, usage_limit: 0,
    applies_to: 'all', start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    is_active: true,
  })

  const load = useCallback(async () => {
    if (!businessId) return
    const p = await getPromoCodes(businessId)
    setPromos(p)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function resetForm() {
    setForm({
      code: generatePromoCode(), discount_type: 'percentage', discount_value: 0, usage_limit: 0,
      applies_to: 'all', start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      is_active: true,
    })
    setEditingId(null)
  }

  async function handleSave() {
    if (editingId) {
      await updatePromoCode(editingId, form)
    } else {
      await createPromoCode(businessId, form)
    }
    resetForm()
    setShowForm(false)
    await load()
  }

  async function handleEdit(p: PromoCode) {
    setForm(p)
    setEditingId(p.id)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Promo Codes</h2>
          <p className="text-sm text-slate-500">Create and manage discount promo codes.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>New promo code</Button>
      </div>
      <MarketingTabs />

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? 'Edit promo code' : 'New promo code'}</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Code</label>
                <Input value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Discount type</label>
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="free_item">Free item</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{form.discount_type === 'percentage' ? 'Percentage (%)' : 'Value'}</label>
                <Input type="number" value={form.discount_value ?? 0} onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Usage limit (0 = unlimited)</label>
                <Input type="number" value={form.usage_limit ?? 0} onChange={(e) => setForm((f) => ({ ...f, usage_limit: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Min purchase</label>
                <Input type="number" value={form.min_purchase ?? 0} onChange={(e) => setForm((f) => ({ ...f, min_purchase: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Applies to</label>
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.applies_to} onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}>
                  <option value="all">All items</option>
                  <option value="service">Services</option>
                  <option value="product">Products</option>
                  <option value="membership">Memberships</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start date</label>
                <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End date</label>
                <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="promo_active" checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300" />
              <label htmlFor="promo_active" className="text-sm">Active</label>
            </div>
            <div className="flex gap-2 justify-end">
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
                  <th className="pb-2 font-medium">Valid</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const valid = p.start_date <= now && p.end_date >= now
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 font-mono font-bold">{p.code}</td>
                      <td className="py-2">{p.discount_type === 'percentage' ? `${p.discount_value}%` : p.discount_type === 'fixed' ? `RM ${p.discount_value}` : 'Free item'}</td>
                      <td className="py-2">{p.used_count}/{p.usage_limit || '∞'}</td>
                      <td className="py-2">{valid ? `${p.start_date} → ${p.end_date}` : 'Expired'}</td>
                      <td className="py-2"><Badge variant={p.is_active ? 'default' : 'muted'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggleActive(p.id, p.is_active)}>{p.is_active ? 'Deactivate' : 'Activate'}</Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {promos.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No promo codes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
