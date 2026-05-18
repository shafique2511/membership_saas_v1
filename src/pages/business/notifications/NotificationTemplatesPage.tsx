import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { NotificationTabs } from './NotificationTabs'
import {
  getTemplates, upsertTemplate, deleteTemplate, resetToDefaults,
  NOTIFICATION_TYPES, CHANNELS, ALL_VARIABLES,
  type NotificationTemplate,
} from '@/services/notifications'

const channelBadge: Record<string, BadgeVariant> = {
  email: 'default',
  whatsapp: 'success',
  telegram: 'warning',
  sms: 'muted',
  in_app: 'default',
}

export function NotificationTemplatesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    const t = await getTemplates(businessId)
    setTemplates(t)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const grouped = templates.reduce<Record<string, NotificationTemplate[]>>((acc, t) => {
    ;(acc[t.notification_type] ??= []).push(t)
    return acc
  }, {})

  function startEdit(t: NotificationTemplate) {
    setEditing(t)
    setEditBody(t.body)
    setEditSubject(t.subject ?? '')
  }

  async function handleSave() {
    if (!editing) return
    await upsertTemplate(businessId, {
      notification_type: editing.notification_type,
      channel: editing.channel,
      subject: editSubject || null,
      body: editBody,
      variables: ALL_VARIABLES.filter((v) => editBody.includes(`{${v}}`)),
      is_active: editing.is_active,
    })
    setEditing(null)
    await load()
  }

  async function handleDelete(id: string) {
    await deleteTemplate(id)
    await load()
  }

  async function handleReset() {
    if (!confirm('Reset all templates to defaults? Custom templates will be overwritten.')) return
    await resetToDefaults(businessId)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notification Templates</h2>
          <p className="text-sm text-slate-500">Manage message templates for all notification types and channels.</p>
        </div>
        <Button variant="outline" onClick={handleReset}>Reset to defaults</Button>
      </div>
      <NotificationTabs />

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{editing.notification_type.replace(/_/g, ' ')} — {editing.channel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing.channel === 'email' && (
              <Field label="Subject" description="Email subject line for this notification template.">
                <input
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </Field>
            )}
            <Field label="Body" description="Message body. Use variables below for customer, booking, payment, and membership data.">
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
            </Field>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Available variables:</p>
              <div className="flex flex-wrap gap-1">
                {ALL_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="text-xs bg-muted px-2 py-0.5 rounded hover:bg-primary/10"
                    onClick={() => setEditBody((prev) => prev + `{${v}}`)}
                  >{`{${v}}`}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {NOTIFICATION_TYPES.map((type) => {
          const typeTemplates = grouped[type] ?? []
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="capitalize text-base">{type.replace(/_/g, ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {CHANNELS.filter((ch) => ch !== 'sms').map((channel) => {
                    const t = typeTemplates.find((tm) => tm.channel === channel)
                    return (
                      <div key={channel} className="flex items-start gap-3 border-b pb-2 last:border-0">
                        <Badge variant={channelBadge[channel] ?? 'muted'} className="shrink-0 w-20 justify-center">{channel}</Badge>
                        <div className="flex-1 min-w-0">
                          {t ? (
                            <>
                              <p className="text-sm truncate">{t.body}</p>
                              {t.subject && <p className="text-xs text-muted-foreground truncate">Subject: {t.subject}</p>}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No template</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {t && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Edit</Button>
                              {!t.is_default && <Button size="sm" variant="outline" onClick={() => handleDelete(t.id)}>Delete</Button>}
                            </>
                          )}
                          {!t && (
                            <Button size="sm" variant="outline" onClick={() => {
                              const fake: NotificationTemplate = {
                                id: '',
                                business_id: businessId,
                                notification_type: type,
                                channel,
                                subject: '',
                                body: '',
                                variables: [],
                                is_default: false,
                                is_active: true,
                                created_at: '',
                                updated_at: '',
                              }
                              setEditing(fake)
                              setEditBody('')
                              setEditSubject('')
                            }}>Create</Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
