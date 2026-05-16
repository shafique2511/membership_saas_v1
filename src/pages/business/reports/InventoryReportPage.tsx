import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getInventoryReport, type InventoryReport } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

export function InventoryReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<InventoryReport | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getInventoryReport(businessId)
    setReport(r)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Inventory Report</h2>
        <p className="text-sm text-slate-500">Stock levels, values, and movement tracking.</p>
      </div>
      <ReportTabs />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Products</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{report?.total_products ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stock Value</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(report?.total_stock_value ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{report?.low_stock_items ?? 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Out of Stock</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{report?.out_of_stock ?? 0}</p></CardContent></Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardContent>
            {report && report.by_category.length > 0 ? (
              <div className="space-y-2">
                {report.by_category.map((c) => (
                  <div key={c.category} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate">{c.category}</span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary rounded" style={{ width: `${(c.value / report.total_stock_value) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{c.count} items</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
