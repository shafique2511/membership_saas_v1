import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StaffTabs } from '@/pages/business/staff/StaffTabs'
import { getCommissionRules, createCommissionRule, updateCommissionRule, deleteCommissionRule, type CommissionRule } from '@/services/staff'

export function CommissionSettingsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', commission_type: 'percentage', target_type: 'all', target_id: '', rate: '0', is_active: true,
  })

  const load = useCallback(async () => {
    if (!businessId) return
    setRules(await getCommissionRules(businessId))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSubmit() {
    const payload = {
      business_id: businessId, name: form.name,
      commission_type: form.commission_type, target_type: form.target_type,
      target_id: form.target_id || null, rate: Number(form.rate), is_active: form.is_active,
    }
    if (editingId) {
      await updateCommissionRule(editingId, payload as Partial<CommissionRule>)
    } else {
      await createCommissionRule(payload as Partial<CommissionRule>)
    }
    setOpen(false)
    setEditingId(null)
    setForm({ name: '', commission_type: 'percentage', target_type: 'all', target_id: '', rate: '0', is_active: true })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Commission settings</h2>
          <p className="text-sm text-slate-500">Define commission rules for services, products, and sales.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setOpen(true) }}>Add rule</Button>
      </div>
      <StaffTabs />

      <DataTable
        columns={[
          { key: 'name', header: 'Rule' },
          { key: 'commission_type', header: 'Type', render: (r) => <Badge variant="muted">{String(r.commission_type)}</Badge> },
          { key: 'target_type', header: 'Target' },
          { key: 'rate', header: 'Rate', render: (r) => String(r.commission_type).includes('percentage') ? `${r.rate}%` : `RM ${r.rate}` },
          { key: 'is_active', header: 'Active', render: (r) => <Badge variant={r.is_active ? undefined : 'muted'}>{r.is_active ? 'Yes' : 'No'}</Badge> },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                setEditingId(String(r.id))
                setForm({
                  name: String(r.name ?? ''), commission_type: String(r.commission_type),
                  target_type: String(r.target_type), target_id: String(r.target_id ?? ''),
                  rate: String(r.rate ?? '0'), is_active: Boolean(r.is_active),
                })
                setOpen(true)
              }}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => void deleteCommissionRule(String(r.id)).then(load)}>Delete</Button>
            </div>
          )},
        ]}
        data={rules as unknown as Record<string, unknown>[]}
        emptyMessage="No commission rules. Add your first rule."
      />

      <FormModal open={open} title={editingId ? 'Edit rule' : 'Add rule'} submitLabel={editingId ? 'Save' : 'Create'} onSubmit={handleSubmit} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null) }}}>
        <div className="space-y-3">
          <Input placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value })}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
            <option value="service_based">Service-based</option>
            <option value="product_based">Product-based</option>
          </select>
          <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })}>
            <option value="all">All items</option>
            <option value="service">Services</option>
            <option value="product">Products</option>
          </select>
          <Input type="number" placeholder="Rate" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
        </div>
      </FormModal>
    </div>
  )
}
