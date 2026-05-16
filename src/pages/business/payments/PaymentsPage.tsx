import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { PaymentsTabs } from './PaymentsTabs'
import { getPayments, type Payment } from '@/services/payments'
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

export function PaymentsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    const p = await getPayments(businessId)
    setPayments(p)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const filtered = payments.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.reference_type.toLowerCase().includes(q) ||
        p.payment_method.toLowerCase().includes(q) ||
        (p.transaction_id ?? '').toLowerCase().includes(q) ||
        (p.id ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payments</h2>
        <p className="text-sm text-slate-500">Track, verify, and manage all payments.</p>
      </div>
      <PaymentsTabs />
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search payments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="unpaid">Unpaid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partial">Partial</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <Card>
        <CardHeader><CardTitle>All payments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-2 capitalize">{p.payment_method.replace(/_/g, ' ')}</td>
                    <td className="py-2 capitalize">{p.reference_type.replace(/_/g, ' ')}</td>
                    <td className="py-2 font-medium">{formatCurrency(Number(p.amount))}</td>
                    <td className="py-2"><Badge variant={statusVariant[p.status] ?? 'muted'}>{p.status}</Badge></td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/business/payments/${p.id}`)}>View</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
