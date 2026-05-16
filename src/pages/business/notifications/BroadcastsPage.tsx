import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { NotificationTabs } from './NotificationTabs'
import {
  getBroadcasts, createBroadcast, updateBroadcast, cancelBroadcast,
  CHANNELS,
  type NotificationBroadcast,
} from '@/services/notifications'

const statusVariant: Record<string, BadgeVariant> = {
  draft: 'muted',
  scheduled: 'warning',
  sending: 'warning',
  sent: 'default',
  cancelled: 'danger',
}

export function BroadcastsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [broadcasts, setBroadcasts] = useState<NotificationBroadcast[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('email')
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    const b = await getBroadcasts(businessId)
    setBroadcasts(b)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleCreate() {
    await createBroadcast(businessId, {
      name,
      channel,
      subject: channel === 'email' ? subject : null,
      body,
      status: 'draft',
    })
    setShowForm(false)
    setName('')
    setBody('')
    setSubject('')
    await load()
  }

  async function handleSend(id: string) {
    await updateBroadcast(id, { status: 'sending' })
    await load()
  }

  async function handleSchedule(id: string) {
    await updateBroadcast(id, { status: 'scheduled', scheduled_at: new Date(Date.now() + 86400000).toISOString() })
    await load()
  }

  async function handleCancel(id: string) {
    await cancelBroadcast(id)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Broadcasts</h2>
          <p className="text-sm text-slate-500">Create and manage broadcast campaigns.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>New broadcast</Button>
      </div>
      <NotificationTabs />

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New broadcast</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-w-xl">
            <div className="space-y-1">
              <label className="text-sm font-medium">Campaign name</label>
              <input className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Channel</label>
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)}>
                {CHANNELS.filter((c) => c !== 'sms').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {channel === 'email' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Subject</label>
                <input className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Message</label>
              <textarea className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All broadcasts</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium">Recipients</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">{b.name}</td>
                    <td className="py-2 capitalize">{b.channel}</td>
                    <td className="py-2">{b.total_recipients} ({b.success_count} ok, {b.fail_count} fail)</td>
                    <td className="py-2"><Badge variant={statusVariant[b.status] ?? 'muted'}>{b.status}</Badge></td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {b.status === 'draft' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleSchedule(b.id)}>Schedule</Button>
                            <Button size="sm" onClick={() => handleSend(b.id)}>Send now</Button>
                          </>
                        )}
                        {(b.status === 'draft' || b.status === 'scheduled') && (
                          <Button size="sm" variant="outline" onClick={() => handleCancel(b.id)}>Cancel</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {broadcasts.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No broadcasts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
