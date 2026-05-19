import { useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { NotificationTabs } from './NotificationTabs'
import { sendNotificationWithResult, NOTIFICATION_TYPES, CHANNELS, ALL_VARIABLES, renderTemplate } from '@/services/notifications'

export function ManualSendPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [channel, setChannel] = useState('in_app')
  const [type, setType] = useState('booking_confirmation')
  const [recipient, setRecipient] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [actionUrl, setActionUrl] = useState<string | null>(null)

  const insertVar = (v: string) => {
    setMessage((prev) => prev + `{${v}}`)
  }

  async function handleSend() {
    if (!message) return
    setSending(true)
    setResult(null)
    setActionUrl(null)
    const sendResult = await sendNotificationWithResult(businessId, {
      channel,
      notificationType: type,
      title: title || type.replace(/_/g, ' '),
      message,
      recipient: recipient || undefined,
    })
    setResult(sendResult.success ? (sendResult.actionUrl ? 'WhatsApp link ready' : 'Sent successfully') : (sendResult.error ?? 'Failed to send'))
    setActionUrl(sendResult.actionUrl)
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Manual Send</h2>
        <p className="text-sm text-slate-500">Compose and send a notification manually.</p>
      </div>
      <NotificationTabs />
      <div className="max-w-xl">
        <Card>
          <CardHeader><CardTitle>Compose</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Channel" description="Where this message will be sent.">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Type" description="Notification category used for logs and template grouping.">
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Recipient" description="Email address, phone number, or channel identifier. Leave blank for internal test logs only.">
              <input
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="email@example.com / phone number"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </Field>
            <Field label="Title" description="Subject or heading shown for email and in-app notifications.">
              <input
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Message" description="Main notification body. Insert variables below to personalize the message.">
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Insert variable:</p>
              <div className="flex flex-wrap gap-1">
                {ALL_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="text-xs bg-muted px-2 py-0.5 rounded hover:bg-primary/10"
                    onClick={() => insertVar(v)}
                  >{`{${v}}`}</button>
                ))}
              </div>
            </div>
            {message.includes('{') && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <p className="text-sm bg-muted p-2 rounded">{renderTemplate(message, { customer_name: 'John', business_name: profile?.business_id ? 'Your Business' : 'N/A', booking_date: '2026-06-01', booking_time: '14:00', service_name: 'Haircut', staff_name: 'Staff', membership_name: 'Gold', expiry_date: '2026-07-01', amount: 'RM 100', payment_status: 'Paid' })}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setMessage(''); setTitle(''); setRecipient(''); setResult(null); setActionUrl(null) }}>Clear</Button>
              <Button onClick={handleSend} disabled={sending || !message}>
                {sending ? 'Sending...' : channel === 'whatsapp' ? 'Generate WhatsApp link' : 'Send'}
              </Button>
            </div>
            {result && <p className={`text-sm ${actionUrl || result.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>{result}</p>}
            {actionUrl && (
              <a href={actionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Open WhatsApp
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
