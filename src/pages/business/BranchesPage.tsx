import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getBranches, createBranch, updateBranch, deleteBranch, getBranchLimit, type Branch } from '@/services/branches'
import { Building2, Plus, Edit3, Trash2, MapPin, Phone, Mail, ShieldAlert } from 'lucide-react'

export function BranchesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const navigate = useNavigate()
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchLimit, setBranchLimit] = useState(99)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Branch>>({ name: '', address: '', phone: '', email: '', is_main: false })

  const load = useCallback(async () => {
    if (!businessId) return
    const [b, limit] = await Promise.all([getBranches(businessId), getBranchLimit(businessId)])
    setBranches(b)
    setBranchLimit(limit)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  function resetForm() {
    setForm({ name: '', address: '', phone: '', email: '', is_main: false })
    setEditingId(null)
    setShowForm(false)
  }

  async function handleSave() {
    if (editingId) {
      await updateBranch(editingId, form)
    } else {
      await createBranch(businessId, form)
    }
    resetForm()
    await load()
  }

  async function handleEdit(b: Branch) {
    setForm({ name: b.name, address: b.address, phone: b.phone, email: b.email, is_main: b.is_main })
    setEditingId(b.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    await deleteBranch(id)
    await load()
  }

  const atLimit = branches.length >= branchLimit

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Branches</h2>
          <p className="text-sm text-slate-500">Manage business locations. Limit: {branchLimit}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} disabled={atLimit && !editingId}>
          <Plus className="mr-1 h-4 w-4" /> Add branch
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? 'Edit branch' : 'New branch'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Branch name" description="Location name shown in booking, staff, inventory, and reports.">
              <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Address" description="Physical address for this branch. Customers may see it on booking pages.">
              <Input value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" description="Branch contact number.">
                <Input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Email" description="Optional branch email for customer contact.">
                <Input value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox" id="is_main"
                checked={form.is_main ?? false}
                onChange={(e) => setForm((f) => ({ ...f, is_main: e.target.checked }))}
                className="mt-1 rounded border-gray-300"
              />
              <label htmlFor="is_main" className="text-sm">
                <span className="font-medium">Main branch</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Used as the default branch for bookings, inventory, and staff assignments.</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <Card key={b.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/business/branches/${b.id}`)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <CardTitle className="text-base">{b.name}</CardTitle>
                </div>
                <Badge variant={b.status === 'active' ? 'default' : 'muted'}>{b.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {b.address && <div className="flex items-center gap-1.5 text-slate-500"><MapPin className="h-3.5 w-3.5" />{b.address}</div>}
              {b.phone && <div className="flex items-center gap-1.5 text-slate-500"><Phone className="h-3.5 w-3.5" />{b.phone}</div>}
              {b.email && <div className="flex items-center gap-1.5 text-slate-500"><Mail className="h-3.5 w-3.5" />{b.email}</div>}
              <div className="flex items-center gap-1.5 text-slate-500">
                {b.is_main ? <Badge variant="default" className="text-xs">Main</Badge> : <span className="text-xs">Branch</span>}
              </div>
              <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={() => handleEdit(b)}><Edit3 className="h-3.5 w-3.5" /></Button>
                {!b.is_main && (
                  <Button size="sm" variant="outline" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {branches.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-12 text-slate-400">
            <Building2 className="h-12 w-12" />
            <p>No branches yet.</p>
            <Button variant="outline" onClick={() => { resetForm(); setShowForm(true) }}>Add your first branch</Button>
          </div>
        )}
      </div>

      {atLimit && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4" />
          Branch limit ({branchLimit}) reached. Upgrade your package to add more branches.
        </div>
      )}
    </div>
  )
}
