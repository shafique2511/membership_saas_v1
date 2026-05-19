import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { useAppContext } from '@/context/useAppContext'
import { addCrmNote, addCustomerTag, defaultCrmTags, getCrmCustomer, getCrmNotes, removeCustomerTag, type CrmCustomer, type CrmNote } from '@/services/crm'
import { formatCurrency } from '@/utils/format'

export function CustomerCrmDetailsPage() {
  const { customerId = '' } = useParams()
  const { hasPermission } = useAppContext()
  const [customer, setCustomer] = useState<CrmCustomer | null>(null)
  const [notes, setNotes] = useState<CrmNote[]>([])
  const [tag, setTag] = useState(defaultCrmTags[0].tag)
  const [customTag, setCustomTag] = useState('')
  const [noteForm, setNoteForm] = useState({ note_type: 'general', title: '', body: '', follow_up_at: '' })

  const canAddNotes = hasPermission('crm.notes.add') || hasPermission('customers.edit') || hasPermission('customers.manage')
  const canManageTags = hasPermission('crm.tags.manage') || hasPermission('customers.edit') || hasPermission('customers.manage')

  const load = useCallback(async () => {
    if (!customerId) return
    const nextCustomer = await getCrmCustomer(customerId)
    setCustomer(nextCustomer)
    setNotes(await getCrmNotes(customerId))
  }, [customerId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleAddTag() {
    if (!customer) return
    const selectedTag = customTag.trim() || tag
    const tagMeta = defaultCrmTags.find((item) => item.tag === selectedTag)
    await addCustomerTag({ business_id: customer.business_id, customer_id: customer.id, tag: selectedTag, color: tagMeta?.color ?? null })
    setCustomTag('')
    await load()
  }

  async function handleAddNote() {
    if (!customer || !noteForm.body.trim()) return
    await addCrmNote({
      business_id: customer.business_id,
      branch_id: customer.branch_id,
      customer_id: customer.id,
      note_type: noteForm.note_type,
      title: noteForm.title,
      body: noteForm.body,
      follow_up_at: noteForm.follow_up_at,
    })
    setNoteForm({ note_type: 'general', title: '', body: '', follow_up_at: '' })
    await load()
  }

  if (!customer) {
    return <div className="text-sm text-muted-foreground">Loading CRM profile...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/business/customers" className="text-sm text-muted-foreground hover:underline">Back to CRM</Link>
          <h2 className="text-lg font-semibold">{customer.full_name}</h2>
          <p className="text-sm text-slate-500">{customer.phone ?? customer.email ?? 'No contact details'}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lifetime Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(customer.lifetime_value)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Last Visit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : 'Never'}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Visits</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{customer.visit_count}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">No-shows</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{customer.no_show_count}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Customer Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Favorite service</span><span>{customer.favorite_service ?? '-'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Favorite product</span><span>{customer.favorite_product ?? '-'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Birthday</span><span>{customer.birthday ? new Date(customer.birthday).toLocaleDateString() : '-'}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Points</span><span>{customer.points_balance}</span></div>
            <div className="flex flex-wrap gap-1 pt-2">
              {customer.tags.length ? customer.tags.map((item) => (
                <Badge key={item.id} variant="muted" className="gap-1">
                  {item.tag}
                  {canManageTags && <button className="ml-1 text-xs" onClick={() => removeCustomerTag(item.id).then(load)}>x</button>}
                </Badge>
              )) : <span className="text-muted-foreground">No tags</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add Tag</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Preset tag" description="Owner or permitted staff can add retention tags.">
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={tag} onChange={(e) => setTag(e.target.value)} disabled={!canManageTags}>
                {defaultCrmTags.map((item) => <option key={item.tag} value={item.tag}>{item.tag}</option>)}
              </select>
            </Field>
            <Field label="Custom tag" description="Optional custom tag for this customer.">
              <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)} disabled={!canManageTags} />
            </Field>
            <Button onClick={handleAddTag} disabled={!canManageTags}>Add tag</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>CRM Notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canAddNotes && (
            <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-3">
              <Field label="Type" description="Classify the CRM note.">
                <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={noteForm.note_type} onChange={(e) => setNoteForm((current) => ({ ...current, note_type: e.target.value }))}>
                  <option value="general">General</option>
                  <option value="preference">Preference</option>
                  <option value="complaint">Complaint</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="medical">Medical</option>
                  <option value="internal">Internal</option>
                </select>
              </Field>
              <Field label="Title" description="Short internal note title.">
                <Input value={noteForm.title} onChange={(e) => setNoteForm((current) => ({ ...current, title: e.target.value }))} />
              </Field>
              <Field label="Follow-up" description="Optional follow-up date and time.">
                <Input type="datetime-local" value={noteForm.follow_up_at} onChange={(e) => setNoteForm((current) => ({ ...current, follow_up_at: e.target.value }))} />
              </Field>
              <Field className="md:col-span-3" label="Note" description="Internal customer retention note.">
                <textarea className="h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={noteForm.body} onChange={(e) => setNoteForm((current) => ({ ...current, body: e.target.value }))} />
              </Field>
              <div className="md:col-span-3">
                <Button onClick={handleAddNote} disabled={!noteForm.body.trim()}>Add note</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{note.note_type.replace(/_/g, ' ')}</Badge>
                    <span className="font-medium">{note.title ?? 'Untitled note'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{note.body}</p>
                {note.follow_up_at && <p className="mt-2 text-xs text-amber-600">Follow up: {new Date(note.follow_up_at).toLocaleString()}</p>}
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No CRM notes yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
