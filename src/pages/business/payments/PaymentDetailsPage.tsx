import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { PaymentsTabs } from './PaymentsTabs'
import { getPaymentById, verifyPayment, processRefund, updatePayment, generateReceipt, type Payment } from '@/services/payments'
import { formatCurrency } from '@/utils/format'

const statusVariant: Record<string, BadgeVariant> = {
  paid: 'default',
  verified: 'success',
  pending: 'warning',
  unpaid: 'muted',
  failed: 'danger',
  refunded: 'muted',
  partial: 'warning',
  cancelled: 'muted',
}

export function PaymentDetailsPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const { profile } = useAppContext()
  const navigate = useNavigate()
  const businessId = profile?.business_id ?? ''
  const userId = profile?.id ?? ''
  const [payment, setPayment] = useState<Payment | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  const load = useCallback(async () => {
    if (!paymentId) return
    const p = await getPaymentById(paymentId)
    setPayment(p)
  }, [paymentId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  if (!payment) return <div className="text-sm text-muted-foreground p-6">Loading payment...</div>

  const p = payment

  const handleVerify = async () => {
    if (!paymentId) return
    await verifyPayment(paymentId, userId)
    await load()
  }

  const handleRefund = async () => {
    if (!paymentId || !refundAmount) return
    await processRefund(paymentId, Number(refundAmount), refundReason || 'Customer requested refund')
    await load()
  }

  const handleGenerateReceipt = async () => {
    if (!paymentId || !businessId) return
    await generateReceipt(businessId, paymentId, {
      payment_id: paymentId,
      amount: p.amount,
      method: p.payment_method,
      paid_at: p.paid_at,
      reference_type: p.reference_type,
    })
    alert('Receipt generated')
  }

  const handleMarkPaid = async () => {
    if (!paymentId) return
    await updatePayment(paymentId, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate('/business/payments')}>Back</Button>
        <div>
          <h2 className="text-lg font-semibold">Payment Details</h2>
          <p className="text-sm text-slate-500">{p.id}</p>
        </div>
      </div>
      <PaymentsTabs />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatCurrency(Number(p.amount))}</span></div>
            {p.deposit_amount && <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>{formatCurrency(Number(p.deposit_amount))}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{p.payment_method.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{p.reference_type.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={statusVariant[p.status] ?? 'muted'}>{p.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span className="font-mono text-xs">{p.transaction_id ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid at</span><span>{p.paid_at ? new Date(p.paid_at).toLocaleString() : '-'}</span></div>
            {p.due_date && <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span>{new Date(p.due_date).toLocaleDateString()}</span></div>}
            {p.notes && <div className="flex justify-between"><span className="text-muted-foreground">Notes</span><span>{p.notes}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {p.proof_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment proof:</p>
                <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View proof</a>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {p.status === 'pending' && (
                <Button onClick={handleVerify}>Verify payment</Button>
              )}
              {p.status === 'unpaid' && (
                <Button onClick={handleMarkPaid}>Mark as paid</Button>
              )}
              {(p.status === 'paid' || p.status === 'partial') && (
                <Button variant="outline" onClick={handleGenerateReceipt}>Generate receipt</Button>
              )}
            </div>

            {(p.status === 'paid' || p.status === 'partial') && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium text-destructive">Process refund</p>
                <input
                  type="number"
                  placeholder="Refund amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleRefund} disabled={!refundAmount}>Process refund</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
