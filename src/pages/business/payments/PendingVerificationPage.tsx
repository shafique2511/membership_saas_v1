import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentsTabs } from './PaymentsTabs'
import { getPendingVerifications, verifyPayment, type Payment } from '@/services/payments'
import { formatCurrency } from '@/utils/format'

export function PendingVerificationPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const userId = profile?.id ?? ''
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const p = await getPendingVerifications(businessId)
    setPayments(p)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleVerify(paymentId: string) {
    await verifyPayment(paymentId, userId)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pending Verification</h2>
        <p className="text-sm text-slate-500">Manual payments awaiting proof verification.</p>
      </div>
      <PaymentsTabs />
      <Card>
        <CardHeader><CardTitle>Awaiting verification ({payments.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Proof</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-2 capitalize">{p.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-2 font-medium">{formatCurrency(Number(p.amount))}</td>
                    <td className="py-2">
                      {p.proof_url ? (
                        <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">View</a>
                      ) : (
                        <span className="text-muted-foreground">No proof</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleVerify(p.id)}>Verify</Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/business/payments/${p.id}`)}>Details</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No pending verifications.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
