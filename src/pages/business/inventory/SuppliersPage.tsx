import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { createSupplier, deactivateSupplier, getSuppliers, updateSupplier, type Supplier } from '@/services/inventory'

export function SuppliersPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    is_active: true,
  })

  const load = useCallback(async () => {
    if (!businessId) return
    setSuppliers(await getSuppliers(businessId) as Supplier[])
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  function resetForm() {
    setEditingId(null)
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', is_active: true })
  }

  async function handleSubmit() {
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        is_active: form.is_active,
      }
      if (!payload.name) throw new Error('Supplier name is required.')

      if (editingId) {
        await updateSupplier(editingId, payload)
        toastSuccess('Supplier updated')
      } else {
        await createSupplier(payload)
        toastSuccess('Supplier created')
      }
      setOpen(false)
      resetForm()
      await load()
    } catch (error) {
      toastError(error, 'Failed to save supplier')
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateSupplier(id)
      toastSuccess('Supplier disabled')
      await load()
    } catch (error) {
      toastError(error, 'Failed to disable supplier')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Suppliers</h2>
          <p className="text-sm text-slate-500">Manage supplier contact details for product purchasing and stock-in notes.</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true) }}>Add supplier</Button>
      </div>
      <InventoryTabs />

      <DataTable
        columns={[
          { key: 'name', header: 'Supplier', render: (r) => <span className="font-medium">{String(r.name)}</span> },
          { key: 'contact_person', header: 'Contact', render: (r) => String(r.contact_person ?? '-') },
          { key: 'phone', header: 'Phone', render: (r) => String(r.phone ?? '-') },
          { key: 'email', header: 'Email', render: (r) => String(r.email ?? '-') },
          { key: 'is_active', header: 'Status', render: (r) => (r.is_active === true ? 'Active' : 'Disabled') },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setEditingId(String(r.id))
                setForm({
                  name: String(r.name ?? ''),
                  contact_person: String(r.contact_person ?? ''),
                  phone: String(r.phone ?? ''),
                  email: String(r.email ?? ''),
                  address: String(r.address ?? ''),
                  is_active: Boolean(r.is_active),
                })
                setOpen(true)
              }}>Edit</Button>
              {r.is_active === true && (
                <Button size="sm" variant="secondary" onClick={() => void handleDeactivate(String(r.id))}>Disable</Button>
              )}
            </div>
          )},
        ]}
        data={suppliers as unknown as Record<string, unknown>[]}
        emptyMessage="No suppliers yet. Add suppliers to link products to purchasing contacts."
      />

      <FormModal open={open} title={editingId ? 'Edit supplier' : 'Add supplier'} submitLabel={editingId ? 'Save' : 'Create'} onSubmit={handleSubmit} onOpenChange={(v) => { if (!v) { setOpen(false); resetForm() } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Supplier name" description="Company or person supplying products to your business.">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
          </Field>
          <Field label="Contact person" description="Main person to contact for orders or questions.">
            <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Contact person" />
          </Field>
          <Field label="Phone" description="Supplier phone or WhatsApp number.">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
          </Field>
          <Field label="Email" description="Supplier email for purchase orders or receipts.">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
          </Field>
          <Field className="sm:col-span-2" label="Address" description="Optional supplier address for records.">
            <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
        </div>
      </FormModal>
    </div>
  )
}
