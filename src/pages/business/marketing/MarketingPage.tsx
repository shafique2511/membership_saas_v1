import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, type MarketingCampaign } from '@/services/marketing'

const campaignTypes = ['promo_code', 'discount', 'birthday', 'inactive_customer', 'referral', 'broadcast'] as const

const statusVariant: Record<string, BadgeVariant> = {
  draft: 'muted',
  scheduled: 'warning',
  sent: 'default',
  cancelled: 'danger',
}

export function MarketingPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<MarketingCampaign>>({ campaign_type: 'broadcast', status: 'draft', message: '', name: '' })

  const load = useCallback(async () => {
    if (!businessId) return
    const c = await getCampaigns(businessId)
    setCampaigns(c)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleCreate() {
    await createCampaign(businessId, form)
    setShowForm(false)
    setForm({ campaign_type: 'broadcast', status: 'draft', message: '', name: '' })
    await load()
  }

  async function handleStatusChange(id: string, status: string) {
    await updateCampaign(id, { status } as Partial<MarketingCampaign>)
    await load()
  }

  async function handleDelete(id: string) {
    await deleteCampaign(id)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Marketing Campaigns</h2>
          <p className="text-sm text-slate-500">Create and manage marketing campaigns.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>New campaign</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New campaign</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Campaign name</label>
              <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.campaign_type}
                onChange={(e) => setForm((f) => ({ ...f, campaign_type: e.target.value }))}
              >
                {campaignTypes.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Message</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.message ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>
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
                    <td className="py-2"><Badge variant={statusVariant[c.status] ?? 'muted'}>{c.status}</Badge></td>
                    <td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {c.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(c.id, 'scheduled')}>Schedule</Button>
                        )}
                        {c.status === 'scheduled' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(c.id, 'sent')}>Send now</Button>
                        )}
                        {(c.status === 'draft' || c.status === 'scheduled') && (
                          <Button size="sm" variant="outline" onClick={() => handleDelete(c.id)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No campaigns yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
