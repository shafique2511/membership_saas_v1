import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { MarketingTabs } from './MarketingTabs'
import { getCampaigns, createCampaign, scheduleCampaign, sendCampaign, deleteCampaign, getSegments, getPromoCodes, type MarketingCampaign, type CustomerSegment, type PromoCode } from '@/services/marketing'

const statusVariant: Record<string, BadgeVariant> = {
  draft: 'muted',
  scheduled: 'warning',
  sent: 'default',
  cancelled: 'danger',
}

const campaignTypes = ['promo_code', 'discount', 'birthday', 'inactive_customer', 'referral', 'broadcast'] as const

export function CampaignsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<MarketingCampaign>>({
    campaign_type: 'broadcast', status: 'draft', message: '', name: '', channel: 'in_app',
  })

  const load = useCallback(async () => {
    if (!businessId) return
    const [c, s, p] = await Promise.all([getCampaigns(businessId), getSegments(businessId), getPromoCodes(businessId)])
    setCampaigns(c)
    setSegments(s)
    setPromos(p)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleCreate() {
    await createCampaign(businessId, form)
    setShowForm(false)
    setForm({ campaign_type: 'broadcast', status: 'draft', message: '', name: '', channel: 'in_app' })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="text-sm text-slate-500">Create and manage marketing campaigns.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>New campaign</Button>
      </div>
      <MarketingTabs />

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New campaign</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" description="Internal campaign name for staff and reports.">
                <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Type" description="Campaign purpose, used for reporting and default behavior.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.campaign_type} onChange={(e) => setForm((f) => ({ ...f, campaign_type: e.target.value }))}>
                  {campaignTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Channel" description="Where this campaign message will be sent.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.channel ?? 'in_app'} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="in_app">In-App</option>
                </select>
              </Field>
              <Field label="Target segment" description="Customer group that should receive this campaign.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.segment_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, segment_id: e.target.value || null }))}>
                  <option value="">All customers</option>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.customer_count})</option>)}
                </select>
              </Field>
              <Field label="Promo code" description="Optional promo code attached to the campaign.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.promo_code_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, promo_code_id: e.target.value || null }))}>
                  <option value="">No promo code</option>
                  {promos.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Message" description="Campaign content sent to customers.">
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.message ?? ''} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All campaigns</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 capitalize">{c.campaign_type.replace(/_/g, ' ')}</td>
                    <td className="py-2">{c.channel}</td>
                    <td className="py-2"><Badge variant={statusVariant[c.status] ?? 'muted'}>{c.status}</Badge></td>
                    <td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {c.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => scheduleCampaign(c.id, new Date(Date.now() + 86400000).toISOString())}>Schedule</Button>
                        )}
                        {c.status === 'draft' && (
                          <Button size="sm" onClick={() => sendCampaign(businessId, c.id)}>Send now</Button>
                        )}
                        {(c.status === 'draft' || c.status === 'scheduled') && (
                          <Button size="sm" variant="outline" onClick={() => deleteCampaign(c.id)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No campaigns yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
