import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { getProducts, recordStockMovement, type Product } from '@/services/inventory'

export function LowStockAlertsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [products, setProducts] = useState<Product[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const all = await getProducts(businessId) as Product[]
    setProducts(all.filter((p) => p.is_active && Number(p.stock_quantity) <= Number(p.low_stock_threshold)))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleStockIn(productId: string) {
    await recordStockMovement({ business_id: businessId, product_id: productId, quantity: 10, transaction_type: 'stock_in', notes: 'Auto restock from low stock alert' })
    await load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Low stock alerts</h2>
        <p className="text-sm text-slate-500">{products.length} products below threshold</p>
      </div>
      <InventoryTabs />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Critical (0 stock)</p><p className="mt-1 text-2xl font-bold text-red-600">{products.filter((p) => Number(p.stock_quantity) === 0).length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Low stock</p><p className="mt-1 text-2xl font-bold text-amber-600">{products.filter((p) => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= Number(p.low_stock_threshold)).length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total alerts</p><p className="mt-1 text-2xl font-bold">{products.length}</p></CardContent></Card>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Product', render: (r) => <Link className="font-medium text-teal-700" to={`/business/inventory/products/${String(r.id)}`}>{String(r.name)}</Link> },
          { key: 'sku', header: 'SKU', render: (r) => String(r.sku ?? '-') },
          { key: 'category', header: 'Category', render: (r) => String(r.category ?? '-') },
          { key: 'stock_quantity', header: 'Current', render: (r) => <span className="font-bold text-red-600">{String(r.stock_quantity)}</span> },
          { key: 'low_stock_threshold', header: 'Threshold' },
          { key: 'actions', header: '', render: (r) => <Button size="sm" onClick={() => handleStockIn(String(r.id))}>Add 10 stock</Button> },
        ]}
        data={products as unknown as Record<string, unknown>[]}
        emptyMessage="No low stock alerts. All products are well-stocked."
      />
    </div>
  )
}
