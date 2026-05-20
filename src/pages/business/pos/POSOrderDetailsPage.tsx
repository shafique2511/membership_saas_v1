import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { toastError, toastSuccess } from '@/lib/toast'
import { getOrder, getOrderItems, getOrderPayments, getOrderDiscounts, refundOrder, paymentMethodLabels, type POSOrder, type POSOrderItem, type POSDiscount, type POSPayment } from '@/services/pos'
import { sendOrderReviewRequest } from '@/services/reviews'

export function POSOrderDetailsPage() {
  const { orderId = '' } = useParams()
  const [order, setOrder] = useState<POSOrder | null>(null)
  const [items, setItems] = useState<POSOrderItem[]>([])
  const [payments, setPayments] = useState<POSPayment[]>([])
  const [discounts, setDiscounts] = useState<POSDiscount[]>([])
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [reviewRequestUrl, setReviewRequestUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orderId) return
    setOrder(await getOrder(orderId) as POSOrder | null)
    setItems(await getOrderItems(orderId) as POSOrderItem[])
    setPayments(await getOrderPayments(orderId) as POSPayment[])
    setDiscounts(await getOrderDiscounts(orderId) as POSDiscount[])
  }, [orderId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleRefund() {
    await refundOrder(orderId, refundReason || undefined)
    setRefundOpen(false)
    setRefundReason('')
    await load()
  }

  async function handleSendReviewRequest() {
    if (!order) return
    try {
      const result = await sendOrderReviewRequest(order)
      if (!result.success) {
        toastError(result.error ?? 'No WhatsApp recipient found', 'Failed to create review request')
        return
      }
      setReviewRequestUrl(result.actionUrl)
      toastSuccess(result.actionUrl ? 'WhatsApp review link ready' : 'Review request sent')
    } catch (error) {
      toastError(error, 'Failed to create review request')
    }
  }

  if (!order) return <div className="py-20 text-center text-slate-500">Loading order...</div>

  const customer = (order as unknown as Record<string, unknown>).customers
  const customerData = Array.isArray(customer) ? (customer as { full_name: string; phone: string }[])[0] : customer as { full_name: string; phone: string } | undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Order #{order.order_number}</h2>
          <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {order.order_status === 'completed' && <Button variant="outline" onClick={() => void handleSendReviewRequest()}>Send review request</Button>}
          {order.order_status === 'completed' && <Button variant="destructive" onClick={() => setRefundOpen(true)}>Refund order</Button>}
        </div>
      </div>

      {reviewRequestUrl && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">Review request ready</p>
          <a href={reviewRequestUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Open WhatsApp
          </a>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Status</p>
          <Badge className="mt-1">{order.order_status}</Badge>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Payment</p>
          <Badge className="mt-1" variant={order.payment_status === 'paid' ? undefined : 'muted'}>{order.payment_status}</Badge>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Customer</p>
          <p className="mt-1 font-medium">{customerData?.full_name ?? order.customer_name ?? 'Walk-in'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Total</p>
          <p className="mt-1 text-xl font-bold text-teal-700">RM {Number(order.total_amount).toFixed(2)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="pb-2">Item</th><th className="pb-2">Type</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">Total</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-medium">{item.item_name}</td>
                  <td className="py-2 text-slate-500">{item.item_type}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">RM {Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-2 text-right font-medium">RM {Number(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payments.length === 0 && <p className="text-sm text-slate-400">No payments recorded.</p>}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span>{paymentMethodLabels[p.payment_method] ?? p.payment_method}</span>
                <span className="font-medium">RM {Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total paid</span>
              <span>RM {payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Discounts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {discounts.length === 0 && <p className="text-sm text-slate-400">No discounts applied.</p>}
            {discounts.map((d) => (
              <div key={d.id} className="flex justify-between text-sm">
                <span>{d.description ?? d.discount_type}</span>
                <span className="font-medium text-green-600">-RM {Number(d.discount_amount).toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {order.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{order.notes}</p></CardContent>
        </Card>
      )}

      <FormModal open={refundOpen} title="Refund order" submitLabel="Refund" onSubmit={handleRefund} onOpenChange={(v) => { if (!v) setRefundOpen(false) }}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Are you sure you want to refund order #{order.order_number}?</p>
          <Field label="Refund reason" description="Optional audit note explaining why this order is being refunded.">
            <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Reason for refund" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
