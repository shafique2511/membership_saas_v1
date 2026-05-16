import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCustomerPayments, type CustomerPayment } from '@/services/customerPortal'
import { Wallet, CheckCircle, Clock, XCircle } from 'lucide-react'

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
  const { profile } = useAppContext()
  const customerId = profile?.id ?? ''

  const [payments, setPayments] = useState<CustomerPayment[]>([])

  const load = useCallback(async () => {
    if (!customerId) return
    const p = await getCustomerPayments(customerId)
    setPayments(p)
  }, [customerId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
