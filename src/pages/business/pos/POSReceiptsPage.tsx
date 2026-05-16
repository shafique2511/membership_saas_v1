import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { POSTabs } from '@/pages/business/pos/POSTabs'
import { getReceipts } from '@/services/pos'

export function POSReceiptsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [receipts, setReceipts] = useState<Record<string, unknown>[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    setReceipts(await getReceipts(businessId))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Receipts</h2>
        <p className="text-sm text-slate-500">View and reprint order receipts.</p>
      </div>
      <POSTabs />

      <DataTable
        columns={[
          { key: 'receipt_number', header: 'Receipt', render: (r) => <span className="font-medium">{String(r.receipt_number)}</span> },
          { key: 'pos_orders', header: 'Order', render: (r) => {
            const o = Array.isArray(r.pos_orders) ? r.pos_orders[0] : r.pos_orders
            return o?.order_number ?? '-'
          }},
          { key: 'pos_orders_2', header: 'Customer', render: (r) => {
            const o = Array.isArray(r.pos_orders) ? r.pos_orders[0] : r.pos_orders
            return o?.customer_name ?? 'Walk-in'
          }},
          { key: 'pos_orders_3', header: 'Amount', render: (r) => {
            const o = Array.isArray(r.pos_orders) ? r.pos_orders[0] : r.pos_orders
            return o ? `RM ${Number(o.total_amount).toFixed(2)}` : '-'
          }},
          { key: 'printed', header: 'Printed', render: (r) => r.printed ? <Badge>Yes</Badge> : <Badge variant="muted">No</Badge> },
          { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
          { key: 'actions', header: '', render: () => <Button size="sm" variant="outline" onClick={() => window.print()}>Print</Button> },
        ]}
        data={receipts}
        emptyMessage="No receipts yet."
      />
    </div>
  )
}
