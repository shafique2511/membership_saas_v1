import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { supabase } from '@/lib/supabase'
import { getProducts, recordStockMovement, type Product } from '@/services/inventory'

export function StockInPage() {
  return <StockMovementPage type="stock_in" title="Stock in" description="Record incoming stock from suppliers." submitLabel="Add stock" />
}

export function StockOutPage() {
  return <StockMovementPage type="stock_out" title="Stock out" description="Record outgoing stock (waste, internal use, etc.)." submitLabel="Remove stock" negate />
}

export function StockAdjustmentPage() {
  return <StockMovementPage type="adjustment" title="Stock adjustment" description="Correct stock quantities. Use positive to add, negative to deduct." submitLabel="Adjust" />
}

function StockMovementPage({ type, title, description, submitLabel, negate }: {
  type: string; title: string; description: string; submitLabel: string; negate?: boolean
}) {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    setProducts(await getProducts(businessId) as Product[])
    setBranches(await getBranches(businessId))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSubmit() {
    if (!selectedProduct || !quantity) return
    setSaving(true)
    const q = Number(quantity)
    await recordStockMovement({
      business_id: businessId, product_id: selectedProduct,
      quantity: negate ? -q : q, transaction_type: type,
      notes: notes || undefined, branch_id: selectedBranch || undefined,
    })
    setSaving(false)
    setQuantity('')
    setNotes('')
  }

  const product = products.find((p) => p.id === selectedProduct)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <InventoryTabs />

      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-3 pt-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Product</label>
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
              <option value="">Select product</option>
              {products.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock_quantity} {p.unit}</option>
              ))}
            </select>
          </div>
          {product && (
            <div className="rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-800">
              Current stock: <strong>{product.stock_quantity} {product.unit}</strong> | Cost: RM {Number(product.cost_price).toFixed(2)} | Sell: RM {Number(product.selling_price).toFixed(2)}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Branch</label>
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">Main inventory</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Quantity</label>
            <Input type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" onClick={handleSubmit} disabled={!selectedProduct || !quantity || saving}>{saving ? 'Processing...' : submitLabel}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export async function getBranches(businessId: string) {
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('name')
  return data ?? []
}
