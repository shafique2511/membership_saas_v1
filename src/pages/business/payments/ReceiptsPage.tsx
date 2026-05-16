import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentsTabs } from './PaymentsTabs'
import { getReceipts, type Receipt } from '@/services/payments'
import { formatCurrency } from '@/utils/format'

export function ReceiptsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [receipts, setReceipts] = useState<Receipt[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getReceipts(businessId)
    setReceipts(r)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Receipts</h2>
        <p className="text-sm text-slate-500">View and send payment receipts.</p>
      </div>
      <PaymentsTabs />
      <Card>
        <CardHeader><CardTitle>All receipts</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Receipt</th>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Sent</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{r.receipt_number}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{r.payment_id.slice(0, 8)}...</td>
                    <td className="py-2 font-medium">{formatCurrency(Number((r.receipt_data as Record<string, unknown>)?.amount ?? 0))}</td>
                    <td className="py-2">{r.recipient_email ?? '-'}</td>
                    <td className="py-2">{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : 'Not sent'}</td>
                    <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No receipts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
