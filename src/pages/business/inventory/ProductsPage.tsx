import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { getProducts, createProduct, updateProduct, getCategories, getSuppliers, type Product, type Supplier } from '@/services/inventory'

export function ProductsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [products, setProducts] = useState<(Product & { suppliers?: { name: string }[] })[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', category: '', description: '',
    unit: 'pcs', cost_price: '0', selling_price: '0',
    stock_quantity: '0', low_stock_threshold: '0',
    min_stock_level: '0', max_stock_level: '', supplier_id: '', is_active: true,
  })

  const load = useCallback(async () => {
    if (!businessId) return
    setProducts(await getProducts(businessId, { category: catFilter || undefined, search: search || undefined }) as (Product & { suppliers?: { name: string }[] })[])
    setCategories(await getCategories(businessId))
    setSuppliers(await getSuppliers(businessId))
  }, [businessId, catFilter, search])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSubmit() {
    const payload: Record<string, unknown> = {
      business_id: businessId, name: form.name, sku: form.sku || null, barcode: form.barcode || null,
      category: form.category || null, description: form.description || null, unit: form.unit,
      cost_price: Number(form.cost_price), selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity), low_stock_threshold: Number(form.low_stock_threshold),
      min_stock_level: Number(form.min_stock_level),
      max_stock_level: form.max_stock_level ? Number(form.max_stock_level) : null,
      supplier_id: form.supplier_id || null, is_active: form.is_active,
    }
    if (editingId) {
      await updateProduct(editingId, payload as Partial<Product>)
    } else {
      await createProduct(payload as Partial<Product>)
    }
    setOpen(false)
    setEditingId(null)
    setForm({ name: '', sku: '', barcode: '', category: '', description: '', unit: 'pcs', cost_price: '0', selling_price: '0', stock_quantity: '0', low_stock_threshold: '0', min_stock_level: '0', max_stock_level: '', supplier_id: '', is_active: true })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-slate-500">{products.length} products</p>
        </div>
        <Button onClick={() => { setEditingId(null); setOpen(true) }}>Add product</Button>
      </div>
      <InventoryTabs />

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <button onClick={() => setCatFilter('')} className={`rounded-full px-3 py-1 text-xs font-medium ${!catFilter ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>All</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-3 py-1 text-xs font-medium ${catFilter === c ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{c}</button>
          ))}
        </div>
        <Input placeholder="Search name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="ml-auto w-56" />
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Product', render: (r) => <Link className="font-medium text-teal-700" to={`/business/inventory/products/${String(r.id)}`}>{String(r.name)}</Link> },
          { key: 'sku', header: 'SKU', render: (r) => String(r.sku ?? '-') },
          { key: 'category', header: 'Category', render: (r) => String(r.category ?? '-') },
          { key: 'stock_quantity', header: 'Stock', render: (r) => {
            const qty = Number(r.stock_quantity)
            const threshold = Number(r.low_stock_threshold)
            return <span className={`font-medium ${qty <= threshold ? 'text-red-600' : ''}`}>{qty} {String(r.unit)}</span>
          }},
          { key: 'cost_price', header: 'Cost', render: (r) => `RM ${Number(r.cost_price).toFixed(2)}` },
          { key: 'selling_price', header: 'Sell', render: (r) => `RM ${Number(r.selling_price).toFixed(2)}` },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                setEditingId(String(r.id))
                setForm({
                  name: String(r.name ?? ''), sku: String(r.sku ?? ''), barcode: String(r.barcode ?? ''),
                  category: String(r.category ?? ''), description: String(r.description ?? ''), unit: String(r.unit ?? 'pcs'),
                  cost_price: String(r.cost_price ?? '0'), selling_price: String(r.selling_price ?? '0'),
                  stock_quantity: String(r.stock_quantity ?? '0'), low_stock_threshold: String(r.low_stock_threshold ?? '0'),
                  min_stock_level: String(r.min_stock_level ?? '0'), max_stock_level: String(r.max_stock_level ?? ''),
                  supplier_id: String(r.supplier_id ?? ''), is_active: Boolean(r.is_active),
                })
                setOpen(true)
              }}>Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => void updateProduct(String(r.id), { is_active: !r.is_active } as Partial<Product>).then(load)}>{r.is_active ? 'Disable' : 'Enable'}</Button>
            </div>
          )},
        ]}
        data={products as unknown as Record<string, unknown>[]}
        emptyMessage="No products. Add your first product."
      />

      <FormModal open={open} title={editingId ? 'Edit product' : 'Add product'} submitLabel={editingId ? 'Save' : 'Create'} onSubmit={handleSubmit} onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null) }}}>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} list="cats" />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <Input placeholder="Unit (pcs, kg, ml...)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <textarea className="sm:col-span-2 h-16 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="number" placeholder="Cost price (RM)" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
          <Input type="number" placeholder="Selling price (RM)" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          <Input type="number" placeholder="Stock quantity" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
          <Input type="number" placeholder="Low stock threshold" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
          <Input type="number" placeholder="Min stock level" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} />
          <Input type="number" placeholder="Max stock level" value={form.max_stock_level} onChange={(e) => setForm({ ...form, max_stock_level: e.target.value })} />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">No supplier</option>
            {suppliers.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
        </div>
      </FormModal>
    </div>
  )
}
