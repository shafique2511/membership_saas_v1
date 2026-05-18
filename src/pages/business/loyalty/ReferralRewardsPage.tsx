import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { LoyaltyTabs } from '@/pages/business/loyalty/LoyaltyTabs'
import { getReferralRewards, createReferralReward, getLoyaltySettings, type ReferralReward } from '@/services/loyalty'
import { searchCustomers } from '@/services/memberships'

export function ReferralRewardsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [referrals, setReferrals] = useState<(ReferralReward & { referrer?: { full_name: string }; referred?: { full_name: string } })[]>([])
  const [open, setOpen] = useState(false)
  const [referralPoints, setReferralPoints] = useState(200)
  const [referrerSearch, setReferrerSearch] = useState('')
  const [referredSearch, setReferredSearch] = useState('')
  const [referrerResults, setReferrerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [referredResults, setReferredResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [form, setForm] = useState({ referrer_id: '', referred_id: '', referred_name: '' })

  const load = useCallback(async () => {
    if (!businessId) return
    setReferrals(await getReferralRewards(businessId))
    const s = await getLoyaltySettings(businessId)
    if (s) setReferralPoints(s.referral_reward_points)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  useEffect(() => {
    if (referrerSearch.length < 2) { setReferrerResults([]); return }
    const t = window.setTimeout(async () => setReferrerResults(await searchCustomers(businessId, referrerSearch)), 300)
    return () => window.clearTimeout(t)
  }, [referrerSearch, businessId])

  useEffect(() => {
    if (referredSearch.length < 2) { setReferredResults([]); return }
    const t = window.setTimeout(async () => setReferredResults(await searchCustomers(businessId, referredSearch)), 300)
    return () => window.clearTimeout(t)
  }, [referredSearch, businessId])

  async function handleCreate() {
    await createReferralReward({
      business_id: businessId,
      referrer_customer_id: form.referrer_id,
      referred_customer_id: form.referred_id,
      referred_name: form.referred_name,
      points_awarded: referralPoints,
    })
    setOpen(false)
    setForm({ referrer_id: '', referred_id: '', referred_name: '' })
    setReferrerSearch('')
    setReferredSearch('')
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Referral rewards</h2>
          <p className="text-sm text-slate-500">Track customer referrals and award {referralPoints} points per referral.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add referral</Button>
      </div>
      <LoyaltyTabs />

      <DataTable
        columns={[
          { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { key: 'referrer', header: 'Referrer', render: (r) => {
            const ref = Array.isArray(r.referrer) ? r.referrer[0] : r.referrer
            return ref?.full_name ?? 'Unknown'
          }},
          { key: 'referred', header: 'Referred', render: (r) => {
            const ref = Array.isArray(r.referred) ? r.referred[0] : r.referred
            return ref?.full_name ?? String(r.referred_name ?? 'Unknown')
          }},
          { key: 'points_awarded', header: 'Points', render: (r) => String(r.points_awarded) },
          { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'rewarded' ? undefined : 'muted'}>{String(r.status)}</Badge> },
          { key: 'rewarded_at', header: 'Rewarded', render: (r) => r.rewarded_at ? new Date(String(r.rewarded_at)).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : '-' },
        ]}
        data={referrals as unknown as Record<string, unknown>[]}
        emptyMessage="No referral rewards yet."
      />

      <FormModal open={open} title="Add referral" submitLabel="Create" onSubmit={handleCreate} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <div className="space-y-3">
          <Field label="Referrer customer" description="Existing customer who made the referral and will receive points.">
            {form.referrer_id ? (
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-2 dark:border-slate-700">
                <span className="text-sm font-medium">{
                  referrerResults.find((c) => c.id === form.referrer_id)?.full_name ?? 'Selected'
                }</span>
                <button type="button" className="text-xs text-slate-400" onClick={() => setForm({ ...form, referrer_id: '' })}>Change</button>
              </div>
            ) : (
              <>
                <Input placeholder="Search referrer..." value={referrerSearch} onChange={(e) => setReferrerSearch(e.target.value)} />
                {referrerResults.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                    {referrerResults.map((c) => (
                      <button key={c.id} type="button" onClick={() => setForm({ ...form, referrer_id: c.id, referred_name: c.full_name })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                        <span className="font-medium">{c.full_name}</span>
                        {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Field>
          <Field label="Referred customer" description="Customer who was referred. Select an existing customer record.">
            {form.referred_id ? (
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-2 dark:border-slate-700">
                <span className="text-sm font-medium">{
                  referredResults.find((c) => c.id === form.referred_id)?.full_name ?? 'Selected'
                }</span>
                <button type="button" className="text-xs text-slate-400" onClick={() => setForm({ ...form, referred_id: '' })}>Change</button>
              </div>
            ) : (
              <>
                <Input placeholder="Search referred customer..." value={referredSearch} onChange={(e) => setReferredSearch(e.target.value)} />
                {referredResults.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                    {referredResults.map((c) => (
                      <button key={c.id} type="button" onClick={() => setForm({ ...form, referred_id: c.id })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                        <span className="font-medium">{c.full_name}</span>
                        {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Field>
          <p className="text-sm text-slate-500">Referrer will receive <strong>{referralPoints} points</strong>.</p>
        </div>
      </FormModal>
    </div>
  )
}
