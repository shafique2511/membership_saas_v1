import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCustomerPayments, type CustomerPayment } from '@/services/customerPortal'
import { Wallet, CheckCircle, Clock, XCircle, ReceiptText, Printer } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'

const STATUS_ICONS: Record<string, React.ReactNode> = {
  paid: <CheckCircle className="h-4 w-4 text-green-500" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  refunded: <XCircle className="h-4 w-4 text-slate-400" />,
  cancelled: <XCircle className="h-4 w-4 text-slate-400" />,
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-500',
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  qr: 'QR Pay',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  stripe: 'Stripe',
  billplz: 'Billplz',
  toyyibpay: 'ToyyibPay',
  senangpay: 'SenangPay',
  credit: 'Credit',
  points: 'Points',
}

export function CustomerPaymentHistoryPage() {
  const { customerId } = useCustomerAccount()

  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerPayment | null>(null)

  const load = useCallback(async () => {
    if (!customerId) return
    const p = await getCustomerPayments(customerId)
    setPayments(p)
  }, [customerId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  function printReceipt(payment: CustomerPayment) {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return
    printWindow.document.write(`<!doctype html>
<html><head><title>Receipt</title><style>
body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}.receipt{max-width:360px;margin:0 auto;border:1px solid #dbe3ea;border-radius:12px;padding:20px}h1{font-size:20px;margin:0 0 8px}.row{display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding:10px 0;font-size:14px}.total{font-weight:700;font-size:18px}
</style></head><body><div class="receipt">
<h1>${payment.business_name ?? 'Receipt'}</h1>
<p>${payment.customer_name ?? 'Customer receipt'}</p>
<div class="row"><span>Date</span><span>${new Date(payment.created_at).toLocaleString('en-MY')}</span></div>
<div class="row"><span>Method</span><span>${METHOD_LABELS[payment.payment_method] ?? payment.payment_method}</span></div>
<div class="row"><span>Status</span><span>${payment.status}</span></div>
<div class="row"><span>Reference</span><span>${payment.transaction_id ?? payment.id}</span></div>
<div class="row total"><span>Total</span><span>RM ${payment.amount.toFixed(2)}</span></div>
</div><script>window.onload=()=>window.print()</script></body></html>`)
    printWindow.document.close()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payment history</h2>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <Wallet className="mx-auto mb-2 h-10 w-10" />
            No payments yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      {STATUS_ICONS[p.status] ?? <Wallet className="h-5 w-5 text-slate-400" />}
                    </div>
                    <div>
                      <p className="font-medium">{METHOD_LABELS[p.payment_method] ?? p.payment_method}</p>
                      <p className="text-xs text-slate-400 capitalize">{p.reference_type} payment</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">RM {p.amount.toFixed(2)}</p>
                    <Badge className={STATUS_STYLES[p.status] ?? ''}>{p.status}</Badge>
                  </div>
                </div>
                {p.transaction_id && (
                  <p className="mt-2 text-[10px] text-slate-400">Ref: {p.transaction_id}</p>
                )}
                <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => setSelectedReceipt(p)}>
                  <ReceiptText className="mr-1 h-4 w-4" /> View receipt
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedReceipt && (
        <Card className="border-teal-200 dark:border-teal-800">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Receipt</p>
                <h3 className="font-semibold">{selectedReceipt.business_name ?? 'Luxantara Members'}</h3>
              </div>
              <Badge className={STATUS_STYLES[selectedReceipt.status] ?? ''}>{selectedReceipt.status}</Badge>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
              <div className="flex justify-between py-1"><span>Customer</span><span>{selectedReceipt.customer_name ?? '-'}</span></div>
              <div className="flex justify-between py-1"><span>Payment method</span><span>{METHOD_LABELS[selectedReceipt.payment_method] ?? selectedReceipt.payment_method}</span></div>
              <div className="flex justify-between py-1"><span>Date</span><span>{new Date(selectedReceipt.created_at).toLocaleDateString('en-MY')}</span></div>
              <div className="flex justify-between py-1"><span>Reference</span><span className="max-w-40 truncate">{selectedReceipt.transaction_id ?? selectedReceipt.id}</span></div>
              <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>RM {selectedReceipt.amount.toFixed(2)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setSelectedReceipt(null)}>Close</Button>
              <Button onClick={() => printReceipt(selectedReceipt)}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
