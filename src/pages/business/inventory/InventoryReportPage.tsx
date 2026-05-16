import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { InventoryTabs } from '@/pages/business/inventory/InventoryTabs'
import { getInventoryTransactions, getInventoryReport, type InventoryTransaction } from '@/services/inventory'

export function InventoryReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<{
    totalProducts: number; totalValue: number; totalRetailValue: number;
    lowStockCount: number; outOfStockCount: number; totalStockQty: number;
    categoryBreakdown: { category: string; count: number; stockQty: number; value: number }[]
  } | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<(InventoryTransaction & Record<string, unknown>)[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    setReport(await getInventoryReport(businessId))
    setRecentTransactions(await getInventoryTransactions(businessId, { limit: 20 }) as (InventoryTransaction & Record<string, unknown>)[])
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!report) return <div className="py-20 text-center text-slate-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Inventory report</h2>
        <p className="text-sm text-slate-500">Summary of products, stock levels, and values.</p>
      </div>
      <InventoryTabs />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total products</p><p className="mt-1 text-2xl font-bold">{report.totalProducts}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total stock qty</p><p className="mt-1 text-2xl font-bold">{report.totalStockQty}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Stock value (cost)</p><p className="mt-1 text-2xl font-bold text-teal-700">RM {report.totalValue.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Retail value</p><p className="mt-1 text-2xl font-bold text-blue-600">RM {report.totalRetailValue.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Low stock</p><p className={`mt-1 text-2xl font-bold ${report.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{report.lowStockCount}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Out of stock</p><p className={`mt-1 text-2xl font-bold ${report.outOfStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>{report.outOfStockCount}</p></CardContent></Card>
      </div>

      {report.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Category breakdown</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="pb-2">Category</th><th className="pb-2 text-right">Products</th><th className="pb-2 text-right">Stock qty</th><th className="pb-2 text-right">Value</th></tr></thead>
              <tbody>
                {report.categoryBreakdown.map((cat) => (
                  <tr key={cat.category} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 font-medium">{cat.category}</td>
                    <td className="py-2 text-right">{cat.count}</td>
                    <td className="py-2 text-right">{cat.stockQty}</td>
                    <td className="py-2 text-right">RM {cat.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
              { key: 'products', header: 'Product', render: (r) => {
                const p = Array.isArray(r.products) ? r.products[0] : r.products
                return p?.name ?? '-'
              }},
              { key: 'transaction_type', header: 'Type' },
              { key: 'quantity', header: 'Qty', render: (r) => {
                const q = Number(r.quantity)
                return <span className={`font-medium ${q > 0 ? 'text-green-600' : 'text-red-600'}`}>{q > 0 ? '+' : ''}{q}</span>
              }},
            ]}
            data={recentTransactions as unknown as Record<string, unknown>[]}
            emptyMessage="No recent transactions."
          />
        </CardContent>
      </Card>
    </div>
  )
}
