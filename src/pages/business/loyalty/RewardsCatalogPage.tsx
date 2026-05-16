import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { LoyaltyTabs } from '@/pages/business/loyalty/LoyaltyTabs'
import { getRewards, createReward, updateReward, deleteReward, rewardTypeLabels, type Reward } from '@/services/loyalty'

export function RewardsCatalogPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [rewards, setRewards] = useState<Reward[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', reward_type: 'voucher', description: '', points_required: '100',
    discount_amount: '', discount_percent: '', free_item: '', item_name: '',
    voucher_code: '', usage_limit: '', is_active: true,
  })

  const load = useCallback(async () => {
    if (!businessId) return
    setRewards(await getRewards(businessId))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSubmit() {
    const payload: Record<string, unknown> = {
      business_id: businessId,
      name: form.name,
      reward_type: form.reward_type,
      description: form.description || null,
      points_required: Number(form.points_required),
      is_active: form.is_active,
    }
    if (form.reward_type === 'voucher' || form.reward_type === 'discount') {
      payload.discount_amount = form.discount_amount ? Number(form.discount_amount) : null
      payload.discount_percent = form.discount_percent ? Number(form.discount_percent) : null
    }
    if (form.reward_type === 'free_item') {
      payload.free_item = form.free_item || null
      payload.item_name = form.item_name || null
    }
    if (form.voucher_code) payload.voucher_code = form.voucher_code
    if (form.usage_limit) payload.usage_limit = Number(form.usage_limit)

    if (editingId) {
      await updateReward(editingId, payload as Partial<Reward>)
    } else {
      await createReward(payload as {
        business_id: string; name: string; description?: string | null;
        reward_type: string; points_required: number;
        discount_amount?: number | null; discount_percent?: number | null;
        free_item?: string | null; item_name?: string | null;
        voucher_code?: string | null; usage_limit?: number | null; is_active?: boolean;
      })
    }
    setOpen(false)
    setEditingId(null)
    setForm({ name: '', reward_type: 'voucher', description: '', points_required: '100', discount_amount: '', discount_percent: '', free_item: '', item_name: '', voucher_code: '', usage_limit: '', is_active: true })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Rewards catalog</h2>
          <p className="text-sm text-slate-500">Create and manage rewards that customers can redeem with points.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setOpen(true) }}>Create reward</Button>
      </div>
      <LoyaltyTabs />

      <div className="grid gap-4 lg:grid-cols-3">
        {rewards.map((r) => (
          <Card key={r.id} className={r.is_active ? '' : 'opacity-60'}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {r.name}
                <Badge>{rewardTypeLabels[r.reward_type] ?? r.reward_type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {r.description && <p className="text-slate-500">{r.description}</p>}
              <p className="font-medium">{r.points_required} points</p>
              {r.discount_amount && <p>RM {r.discount_amount} discount</p>}
              {r.discount_percent && <p>{r.discount_percent}% discount</p>}
              {r.free_item && <p>Free: {r.free_item}</p>}
              {r.item_name && <p>Item: {r.item_name}</p>}
              {r.voucher_code && <p>Code: {r.voucher_code}</p>}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">{r.times_redeemed} redeemed{r.usage_limit ? ` / ${r.usage_limit} limit` : ''}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditingId(r.id)
                    setForm({
                      name: r.name, reward_type: r.reward_type, description: r.description ?? '',
                      points_required: String(r.points_required),
                      discount_amount: String(r.discount_amount ?? ''),
                      discount_percent: String(r.discount_percent ?? ''),
                      free_item: r.free_item ?? '', item_name: r.item_name ?? '',
                      voucher_code: r.voucher_code ?? '', usage_limit: String(r.usage_limit ?? ''),
                      is_active: r.is_active,
                    })
                    setOpen(true)
                  }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => void deleteReward(r.id).then(load)}>Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rewards.length === 0 && (
          <div className="lg:col-span-3 py-12 text-center text-sm text-slate-400">No rewards created yet.</div>
        )}
      </div>

      <FormModal
        open={open}
        title={editingId ? 'Edit reward' : 'Create reward'}
        submitLabel={editingId ? 'Save' : 'Create'}
        onSubmit={handleSubmit}
        onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null) }}}
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <Input placeholder="Reward name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.reward_type} onChange={(e) => setForm({ ...form, reward_type: e.target.value })}>
            {Object.entries(rewardTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea className="sm:col-span-2 h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="number" placeholder="Points required" value={form.points_required} onChange={(e) => setForm({ ...form, points_required: e.target.value })} />
          {form.reward_type === 'discount' || form.reward_type === 'voucher' ? (
            <>
              <Input type="number" placeholder="Discount amount (RM)" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} />
              <Input type="number" placeholder="Discount percent (%)" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            </>
          ) : null}
          {form.reward_type === 'free_item' ? (
            <>
              <Input placeholder="Free item name" value={form.free_item} onChange={(e) => setForm({ ...form, free_item: e.target.value })} />
              <Input placeholder="Item detail" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
            </>
          ) : null}
          <Input placeholder="Voucher code" value={form.voucher_code} onChange={(e) => setForm({ ...form, voucher_code: e.target.value })} />
          <Input type="number" placeholder="Usage limit" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
        </div>
      </FormModal>
    </div>
  )
}
