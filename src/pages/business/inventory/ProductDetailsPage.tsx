import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { getProduct, getInventoryTransactions, recordStockMovement, type Product, type InventoryTransaction } from '@/services/inventory'

export function ProductDetailsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const { productId = '' } = useParams()
  const [product, setProduct] = useState<(Product & { suppliers?: { name: string }[] }) | null>(null)
  const [transactions, setTransactions] = useState<(InventoryTransaction & Record<string, unknown>)[]>([])
  const [open, setOpen] = useState<'in' | 'out' | 'adjust' | null>(null)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    if (!productId) return
    setProduct(await getProduct(productId) as (Product & { suppliers?: { name: string }[] }) | null)
    setTransactions(await getInventoryTransactions(businessId, { product_id: productId }) as (InventoryTransaction & Record<string, unknown>)[])
  }, [productId, businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleAction() {
    if (!product) return
    const q = Number(qty)
    if (!q || q <= 0) return

    if (open === 'in') {
      await recordStockMovement({ business_id: businessId, product_id: productId, quantity: q, transaction_type: 'stock_in', notes: reason || undefined })
    } else if (open === 'out') {
      await recordStockMovement({ business_id: businessId, product_id: productId, quantity: -q, transaction_type: 'stock_out', notes: reason || undefined })
    } else if (open === 'adjust') {
      await recordStockMovement({ business_id: businessId, product_id: productId, quantity: q, transaction_type: 'adjustment', notes: reason || undefined })
    }
    setOpen(null)
    setQty('')
    setReason('')
    await load()
  }

  if (!product) return <div className="py-20 text-center text-slate-500">Loading...</div>

  const isLow = Number(product.stock_quantity) <= Number(product.low_stock_threshold)
  const supplier = Array.isArray(product.suppliers) ? product.suppliers[0] : product.suppliers

  return (
    <div className="space-y-6">
      <InventoryTabs />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Product</p>
          <p className="mt-1 text-lg font-medium">{product.name}</p>
          {product.sku && <p className="text-xs text-slate-400">SKU: {product.sku}</p>}
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Stock</p>
          <p className={`mt-1 text-2xl font-bold ${isLow ? 'text-red-600' : 'text-teal-700'}`}>{product.stock_quantity} {product.unit}</p>
          {isLow && <p className="text-xs text-red-500">Below threshold ({product.low_stock_threshold})</p>}
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Cost / Sell</p>
          <p className="mt-1 font-medium">RM {Number(product.cost_price).toFixed(2)} / RM {Number(product.selling_price).toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Supplier</p>
          <p className="mt-1 font-medium">{supplier?.name ?? '-'}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => { setOpen('in'); setQty('') }}>Stock in</Button>
        <Button variant="outline" onClick={() => { setOpen('out'); setQty('') }}>Stock out</Button>
        <Button variant="secondary" onClick={() => { setOpen('adjust'); setQty('') }}>Adjust</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Transaction history</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
              { key: 'transaction_type', header: 'Type', render: (r) => <Badge variant="muted">{String(r.transaction_type)}</Badge> },
              { key: 'quantity', header: 'Qty', render: (r) => {
                const q = Number(r.quantity)
                return <span className={`font-medium ${q > 0 ? 'text-green-600' : q < 0 ? 'text-red-600' : ''}`}>{q > 0 ? '+' : ''}{q}</span>
              }},
              { key: 'notes', header: 'Notes', render: (r) => String(r.notes ?? '-') },
              { key: 'from_branch', header: 'From', render: (r) => {
                const b = r.from_branch ? (Array.isArray(r.from_branch) ? r.from_branch[0] : r.from_branch) : null
                return b?.name ?? '-'
              }},
              { key: 'to_branch', header: 'To', render: (r) => {
                const b = r.to_branch ? (Array.isArray(r.to_branch) ? r.to_branch[0] : r.to_branch) : null
                return b?.name ?? '-'
              }},
            ]}
            data={transactions as unknown as Record<string, unknown>[]}
            emptyMessage="No transactions yet."
          />
        </CardContent>
      </Card>

      <FormModal open={open !== null} title={open === 'in' ? 'Stock in' : open === 'out' ? 'Stock out' : 'Adjust stock'} submitLabel={open === 'in' ? 'Add' : open === 'out' ? 'Remove' : 'Adjust'}
        onSubmit={handleAction} onOpenChange={(v) => { if (!v) setOpen(null) }}>
        <div className="space-y-3">
          <Input type="number" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
          <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Reason / notes" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </FormModal>
    </div>
  )
}
