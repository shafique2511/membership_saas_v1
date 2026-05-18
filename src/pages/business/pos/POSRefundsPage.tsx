import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { POSTabs } from '@/pages/business/pos/POSTabs'
import { getOrders, refundOrder } from '@/services/pos'

export function POSRefundsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [refundOpen, setRefundOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; order_number: string } | null>(null)
  const [refundReason, setRefundReason] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    setOrders(await getOrders(businessId, { status: 'completed', date_from: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) }))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleRefund() {
    if (!selectedOrder) return
    await refundOrder(selectedOrder.id, refundReason || undefined)
    setRefundOpen(false)
    setRefundReason('')
    setSelectedOrder(null)
    await load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Refunds</h2>
        <p className="text-sm text-slate-500">Process refunds for completed orders.</p>
      </div>
      <POSTabs />

      <DataTable
        columns={[
          { key: 'order_number', header: 'Order', render: (r) => <span className="font-medium">{String(r.order_number)}</span> },
          { key: 'customers', header: 'Customer', render: (r) => {
            const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
            return c?.full_name ?? String(r.customer_name ?? 'Walk-in')
          }},
          { key: 'total_amount', header: 'Amount', render: (r) => `RM ${Number(r.total_amount).toFixed(2)}` },
          { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short' }) },
          { key: 'actions', header: '', render: (r) => (
            <Button size="sm" variant="destructive" onClick={() => {
              setSelectedOrder({ id: String(r.id), order_number: String(r.order_number) })
              setRefundOpen(true)
            }}>Refund</Button>
          )},
        ]}
        data={orders.filter((o) => o.order_status === 'completed')}
        emptyMessage="No completed orders to refund."
      />

      <FormModal open={refundOpen} title="Refund order" submitLabel="Refund" onSubmit={handleRefund} onOpenChange={(v) => { if (!v) setRefundOpen(false) }}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Refund order #{selectedOrder?.order_number}?</p>
          <Field label="Refund reason" description="Optional audit note explaining why this order is being refunded.">
            <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
