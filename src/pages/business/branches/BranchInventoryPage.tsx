import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBranchInventory, getBranchById, type Branch } from '@/services/branches'
import { BranchTabs } from './BranchTabs'
import { Package, AlertTriangle } from 'lucide-react'

export function BranchInventoryPage() {
  const { branchId } = useParams()
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [branch, setBranch] = useState<Branch | null>(null)
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getBranchInventory>>>([])

  const load = useCallback(async () => {
    if (!branchId || !businessId) return
    const [b, p] = await Promise.all([getBranchById(branchId), getBranchInventory(branchId, businessId)])
    setBranch(b)
    setProducts(p)
  }, [branchId, businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!branch) return <div className="p-6 text-sm text-slate-400">Loading...</div>

  const lowStock = products.filter((p) => p.is_low_stock && p.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{branch.name} — Inventory</h2>
        <p className="text-sm text-slate-500">Products stocked at this branch.</p>
      </div>

      <BranchTabs />

      {lowStock.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {lowStock.length} product(s) below low-stock threshold
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Products ({products.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Price</th>
                  <th className="p-3 font-medium">Stock</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      <Link to={`/business/inventory/products/${p.id}`} className="hover:underline">{p.name}</Link>
                    </td>
                    <td className="p-3 text-slate-500">{p.sku ?? '-'}</td>
                    <td className="p-3 text-slate-500">{p.category ?? '-'}</td>
                    <td className="p-3">RM {(p.selling_price ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={p.is_low_stock ? 'font-semibold text-red-600' : ''}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant={p.is_active ? 'default' : 'muted'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400">
                    <Package className="mx-auto mb-2 h-8 w-8" />
                    No products at this branch.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
