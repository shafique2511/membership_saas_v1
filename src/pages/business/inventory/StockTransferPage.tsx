import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { getProducts, transferStock, type Product } from '@/services/inventory'
import { getBranches } from '@/pages/business/inventory/StockPages'

export function StockTransferPage() {
  const { profile, hasModule } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const multiBranchEnabled = hasModule('multi_branch')

  const load = useCallback(async () => {
    if (!businessId) return
    setProducts(await getProducts(businessId) as Product[])
    const bs = await getBranches(businessId) as { id: string; name: string }[]
    setBranches(bs)
    if (bs.length > 0) {
      if (!fromBranch) setFromBranch(bs[0].id)
      if (bs.length > 1 && !toBranch) setToBranch(bs[1].id)
    }
  }, [businessId, fromBranch, toBranch])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleTransfer() {
    if (!fromBranch || !toBranch || !productId || !quantity) return
    if (fromBranch === toBranch) { alert('Source and destination must differ'); return }
    setSaving(true)
    await transferStock({
      business_id: businessId, product_id: productId, quantity: Number(quantity),
      from_branch_id: fromBranch, to_branch_id: toBranch, notes: notes || undefined,
    })
    setSaving(false)
    setQuantity('')
    setNotes('')
    await load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Stock transfer</h2>
        <p className="text-sm text-slate-500">{multiBranchEnabled ? 'Transfer stock between branches.' : 'Multi-Branch module required for transfers.'}</p>
      </div>
      <InventoryTabs />

      {multiBranchEnabled && branches.length >= 2 ? (
        <Card className="mx-auto max-w-lg">
          <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">From branch</label>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={fromBranch} onChange={(e) => setFromBranch(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">To branch</label>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={toBranch} onChange={(e) => setToBranch(e.target.value)}>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Product</label>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Select product</option>
                {products.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock_quantity} {p.unit}</option>
                ))}
              </select>
            </div>
            <Input type="number" placeholder="Quantity to transfer" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <textarea className="h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button className="w-full" onClick={handleTransfer} disabled={!fromBranch || !toBranch || !productId || !quantity || saving}>{saving ? 'Transferring...' : 'Transfer'}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-8 text-center text-sm text-slate-400">
          <p>Need at least 2 branches to transfer stock.</p>
          <p className="mt-1 text-xs">Enable the Multi-Branch module to add branches.</p>
        </CardContent></Card>
      )}
    </div>
  )
}
