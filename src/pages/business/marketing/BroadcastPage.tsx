import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { MarketingTabs } from './MarketingTabs'
import { createCampaign, sendCampaign, getSegments, getPromoCodes, type CustomerSegment, type PromoCode } from '@/services/marketing'
import { sendTemplatedNotification } from '@/services/notifications'

export function BroadcastPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('in_app')
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [promoCodeId, setPromoCodeId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const loadSegments = useCallback(async () => {
    if (!businessId) return
    const [s, p] = await Promise.all([getSegments(businessId), getPromoCodes(businessId)])
    setSegments(s)
    setPromos(p)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void loadSegments(), 0)
    return () => window.clearTimeout(t)
  }, [loadSegments])

  async function handleSend() {
    if (!name || !message) return
    setSending(true)
    setResult(null)

    const campaignId = await createCampaign(businessId, {
      name,
      campaign_type: 'broadcast',
      channel,
      subject: channel === 'email' ? subject : null,
      message,
      segment_id: segmentId || null,
      promo_code_id: promoCodeId || null,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    if (campaignId) {
      await sendCampaign(businessId, campaignId)
    }

    await sendTemplatedNotification(businessId, {
      channel,
      notificationType: 'promo_broadcast',
      variables: {
        customer_name: 'Valued Customer',
        business_name: 'your business',
      },
    })

    setResult('Broadcast sent successfully (mock)')
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Broadcast Message</h2>
        <p className="text-sm text-slate-500">Send a broadcast message to your customers.</p>
      </div>
      <MarketingTabs />
      <div className="max-w-xl">
        <Card>
          <CardHeader><CardTitle>Compose broadcast</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Campaign name" description="Internal name used to identify this broadcast in marketing history.">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel" description="Where customers will receive this broadcast.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="in_app">In-App</option>
                </select>
              </Field>
              <Field label="Target segment" description="Choose all customers or a saved customer segment.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
                  <option value="">All customers</option>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.customer_count})</option>)}
                </select>
              </Field>
            </div>
            {channel === 'email' && (
              <Field label="Subject" description="Email subject line for this broadcast.">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
            )}
            <Field label="Message" description="Main broadcast content sent to the selected customers.">
              <textarea className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <Field label="Promo code" description="Optional active promo code to attach to this broadcast.">
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={promoCodeId} onChange={(e) => setPromoCodeId(e.target.value)}>
                <option value="">None</option>
                {promos.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.code} - {p.discount_type === 'percentage' ? `${p.discount_value}%` : `RM${p.discount_value}`}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setName(''); setMessage(''); setSubject(''); setResult(null) }}>Clear</Button>
              <Button onClick={handleSend} disabled={sending || !name || !message}>
                {sending ? 'Sending...' : 'Send broadcast'}
              </Button>
            </div>
            {result && <p className="text-sm text-emerald-600">{result}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
