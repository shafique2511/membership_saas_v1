import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getBranches, createBranch, updateBranch, deleteBranch, type Branch } from '@/services/branches'

export function BranchesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [branches, setBranches] = useState<Branch[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Branch>>({ name: '', address: '', phone: '', email: '', is_main: false })

  const load = useCallback(async () => {
    if (!businessId) return
    const b = await getBranches(businessId)
    setBranches(b)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

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
    setForm(b)
    setEditingId(b.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    await deleteBranch(id)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Branches</h2>
          <p className="text-sm text-slate-500">Manage business locations and branches.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>Add branch</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? 'Edit branch' : 'New branch'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Branch name</label>
              <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Address</label>
              <Input value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_main"
                checked={form.is_main ?? false}
                onChange={(e) => setForm((f) => ({ ...f, is_main: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_main" className="text-sm font-medium">Main branch</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All branches</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Main</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">{b.name}</td>
                    <td className="py-2 text-muted-foreground">{b.address ?? '-'}</td>
                    <td className="py-2">{b.phone ?? '-'}</td>
                    <td className="py-2">{b.is_main ? 'Yes' : '-'}</td>
                    <td className="py-2"><Badge variant={b.status === 'active' ? ('default' as BadgeVariant) : ('muted' as BadgeVariant)}>{b.status}</Badge></td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(b)}>Edit</Button>
                        {!b.is_main && <Button size="sm" variant="outline" onClick={() => handleDelete(b.id)}>Delete</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No branches yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
