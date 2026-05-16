import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getBranchComparison, type BranchComparisonRow } from '@/services/branches'
import { TrendingUp, Download } from 'lucide-react'

export function BranchComparisonReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [rows, setRows] = useState<BranchComparisonRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const r = await getBranchComparison(businessId)
    setRows(r)
    setLoading(false)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  function maxValue(key: keyof BranchComparisonRow): number {
    return Math.max(...rows.map((r) => Number(r[key])), 1)
  }

  function barWidth(row: BranchComparisonRow, key: keyof BranchComparisonRow): string {
    const val = Number(row[key])
    const max = maxValue(key)
    return `${(val / max) * 100}%`
  }

  function handleExportCsv() {
    if (rows.length === 0) return
    const headers = ['Branch', 'Staff', 'Customers', 'Bookings', 'Revenue', 'Products', 'Low Stock']
    const lines = rows.map((r) => [
      r.branch_name, r.staff_count, r.customer_count, r.booking_count,
      r.revenue, r.inventory_count, r.low_stock_count,
    ].join(','))
    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'branch_comparison.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>

  const metrics: { key: keyof BranchComparisonRow; label: string; prefix?: string }[] = [
    { key: 'staff_count', label: 'Staff' },
    { key: 'customer_count', label: 'Customers' },
    { key: 'booking_count', label: 'Bookings' },
    { key: 'revenue', label: 'Revenue', prefix: 'RM ' },
    { key: 'inventory_count', label: 'Products' },
    { key: 'low_stock_count', label: 'Low Stock' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Branch comparison</h2>
          <p className="text-sm text-slate-500">Side-by-side performance of all branches.</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-slate-400">
          <TrendingUp className="mx-auto mb-2 h-10 w-10" />
          No branches to compare.
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium text-muted-foreground">Branch</th>
                {metrics.map((m) => (
                  <th key={m.key} className="p-3 text-left font-medium text-muted-foreground min-w-[140px]">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.branch_id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{row.branch_name}</td>
                  {metrics.map((m) => (
                    <td key={m.key} className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="min-w-[60px] text-right font-semibold tabular-nums">
                          {m.prefix ?? ''}{Number(row[m.key]).toLocaleString('en-MY', m.key === 'revenue' ? { minimumFractionDigits: 2 } : undefined)}
                        </span>
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: barWidth(row, m.key) }}
                          />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length >= 2 && (
        <Card>
          <CardHeader><CardTitle>Quick insights</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(() => {
              const bestRevenue = rows.reduce((best, r) => r.revenue > best.revenue ? r : best, rows[0])
              const bestBookings = rows.reduce((best, r) => r.booking_count > best.booking_count ? r : best, rows[0])
              const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)
              const totalBookings = rows.reduce((sum, r) => sum + r.booking_count, 0)
              return (
                <>
                  <p><strong>Highest revenue:</strong> {bestRevenue.branch_name} (RM {bestRevenue.revenue.toFixed(2)})</p>
                  <p><strong>Most bookings:</strong> {bestBookings.branch_name} ({bestBookings.booking_count})</p>
                  <p><strong>Total revenue (all branches):</strong> RM {totalRevenue.toFixed(2)}</p>
                  <p><strong>Total bookings (all branches):</strong> {totalBookings}</p>
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
