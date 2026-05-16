import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { getPayments, getInvoices, type Payment, type BillingInvoice } from '@/services/payments'
import { formatCurrency } from '@/utils/format'

const statusVariant: Record<string, BadgeVariant> = {
  paid: 'default',
  verified: 'success',
  pending: 'warning',
  failed: 'danger',
  refunded: 'success',
  cancelled: 'muted',
  draft: 'muted',
  issued: 'success',
  overdue: 'danger',
  void: 'muted',
}

export function PaymentsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const [p, i] = await Promise.all([getPayments(businessId), getInvoices(businessId)])
    setPayments(p)
    setInvoices(i)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payments</h2>
        <p className="text-sm text-slate-500">View invoices, payments, and receipts.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due date</th>
                  <th className="pb-2 font-medium">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="py-2">{inv.invoice_number}</td>
                    <td className="py-2">{formatCurrency(Number(inv.amount))}</td>
                    <td className="py-2"><Badge variant={statusVariant[inv.status] ?? 'outline'}>{inv.status}</Badge></td>
                    <td className="py-2">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                    <td className="py-2">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Payment Records</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 capitalize">{p.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-2">{formatCurrency(Number(p.amount))}</td>
                    <td className="py-2 capitalize">{p.reference_type.replace(/_/g, ' ')}</td>
                    <td className="py-2"><Badge variant={statusVariant[p.status] ?? 'outline'}>{p.status}</Badge></td>
                    <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No payments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
