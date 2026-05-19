import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationTabs } from './NotificationTabs'
import { getNotifications, type Notification } from '@/services/notifications'

const channelLabels: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  sms: 'SMS',
  in_app: 'In-app',
}

export function NotificationLogPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    const n = await getNotifications(businessId)
    setNotifications(n)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const filtered = notifications.filter((n) => {
    if (filterChannel && n.channel !== filterChannel) return false
    if (filterStatus && n.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notification Log</h2>
        <p className="text-sm text-slate-500">View all sent and queued notifications.</p>
      </div>
      <NotificationTabs />
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
        >
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
          <option value="sms">SMS</option>
          <option value="in_app">In-App</option>
        </select>
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} notifications</span>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent notifications</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Channel</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id} className="border-b last:border-0">
                    <td className="py-2 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</td>
                    <td className="py-2">{channelLabels[n.channel] ?? n.channel}</td>
                    <td className="py-2 capitalize">{n.notification_type.replace(/_/g, ' ')}</td>
                    <td className="max-w-[250px] truncate py-2">{n.title}</td>
                    <td className="py-2">
                      <span className={`text-xs font-medium ${
                        n.status === 'sent' ? 'text-emerald-600' :
                        n.status === 'failed' ? 'text-red-600' :
                        n.status === 'queued' ? 'text-amber-600' :
                        'text-muted-foreground'
                      }`}>{n.status}</span>
                      {n.error_message && <span className="ml-1 text-xs text-red-500">({n.error_message})</span>}
                    </td>
                    <td className="py-2">
                      {n.action_url ? (
                        <a href={n.action_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Open</a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No notifications sent yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
