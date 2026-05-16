import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { PaymentsTabs } from './PaymentsTabs'
import { getRefunds, approveRefund, completeRefund, rejectRefund, type Refund } from '@/services/payments'
import { formatCurrency } from '@/utils/format'

const statusVariant: Record<string, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  completed: 'default',
}

export function RefundsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const userId = profile?.id ?? ''
  const [refunds, setRefunds] = useState<Refund[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await getRefunds(businessId)
    setRefunds(r)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleApprove(id: string) {
    await approveRefund(id, userId)
    await load()
  }

  async function handleComplete(id: string) {
    await completeRefund(id, 'bank_transfer')
    await load()
  }

  async function handleReject(id: string) {
    await rejectRefund(id)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Refunds</h2>
        <p className="text-sm text-slate-500">Manage refund requests and processing.</p>
      </div>
      <PaymentsTabs />
      <Card>
        <CardHeader><CardTitle>All refunds</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-2 font-medium">{formatCurrency(Number(r.amount))}</td>
                    <td className="py-2 text-muted-foreground max-w-[200px] truncate">{r.reason}</td>
                    <td className="py-2 capitalize">{r.refund_method?.replace(/_/g, ' ') ?? '-'}</td>
                    <td className="py-2"><Badge variant={statusVariant[r.status] ?? 'muted'}>{r.status}</Badge></td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {r.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(r.id)}>Reject</Button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <Button size="sm" onClick={() => handleComplete(r.id)}>Complete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No refunds yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
