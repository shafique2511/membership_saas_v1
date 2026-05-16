import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoyaltyTabs } from '@/pages/business/loyalty/LoyaltyTabs'
import { getLoyaltySettings, upsertLoyaltySettings, type LoyaltySettings } from '@/services/loyalty'

export function LoyaltySettingsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [, setSettings] = useState<LoyaltySettings | null>(null)
  const [form, setForm] = useState({
    earning_rate: '1', redemption_rate: '100', redemption_discount_amount: '5',
    birthday_reward_points: '100', referral_reward_points: '200',
    points_expiry_days: '365', min_redemption_points: '100',
    auto_award_birthday: true, auto_award_referral: true,
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getLoyaltySettings(businessId)
    if (s) {
      setSettings(s)
      setForm({
        earning_rate: String(s.earning_rate),
        redemption_rate: String(s.redemption_rate),
        redemption_discount_amount: String(s.redemption_discount_amount),
        birthday_reward_points: String(s.birthday_reward_points),
        referral_reward_points: String(s.referral_reward_points),
        points_expiry_days: String(s.points_expiry_days),
        min_redemption_points: String(s.min_redemption_points),
        auto_award_birthday: s.auto_award_birthday,
        auto_award_referral: s.auto_award_referral,
      })
    }
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSave() {
    setSaving(true)
    await upsertLoyaltySettings(businessId, {
      earning_rate: Number(form.earning_rate),
      redemption_rate: Number(form.redemption_rate),
      redemption_discount_amount: Number(form.redemption_discount_amount),
      birthday_reward_points: Number(form.birthday_reward_points),
      referral_reward_points: Number(form.referral_reward_points),
      points_expiry_days: Number(form.points_expiry_days),
      min_redemption_points: Number(form.min_redemption_points),
      auto_award_birthday: form.auto_award_birthday,
      auto_award_referral: form.auto_award_referral,
    } as Partial<LoyaltySettings>)
    setSaving(false)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Loyalty settings</h2>
        <p className="text-sm text-slate-500">Configure earning rates, redemption rules, birthday and referral rewards.</p>
      </div>
      <LoyaltyTabs />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Points earning</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Earning rate (RM per point)</label>
              <p className="mb-1 text-xs text-slate-400">RM {form.earning_rate} spent = 1 point</p>
              <Input type="number" step="0.1" min="0.1" value={form.earning_rate} onChange={(e) => setForm({ ...form, earning_rate: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Points redemption</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Redemption rate</label>
              <p className="mb-1 text-xs text-slate-400">{form.redemption_rate} points = RM {form.redemption_discount_amount} discount</p>
              <div className="flex gap-2">
                <Input type="number" placeholder="Points" value={form.redemption_rate} onChange={(e) => setForm({ ...form, redemption_rate: e.target.value })} />
                <Input type="number" placeholder="Discount (RM)" value={form.redemption_discount_amount} onChange={(e) => setForm({ ...form, redemption_discount_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Minimum redemption points</label>
              <Input type="number" value={form.min_redemption_points} onChange={(e) => setForm({ ...form, min_redemption_points: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Points expiry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Expiry (days)</label>
              <Input type="number" value={form.points_expiry_days} onChange={(e) => setForm({ ...form, points_expiry_days: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Birthday & referral</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Birthday reward points</label>
              <Input type="number" value={form.birthday_reward_points} onChange={(e) => setForm({ ...form, birthday_reward_points: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_award_birthday} onChange={(e) => setForm({ ...form, auto_award_birthday: e.target.checked })} />
              Auto-award birthday rewards
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Referral reward points</label>
              <Input type="number" value={form.referral_reward_points} onChange={(e) => setForm({ ...form, referral_reward_points: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_award_referral} onChange={(e) => setForm({ ...form, auto_award_referral: e.target.checked })} />
              Auto-award referral rewards
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
