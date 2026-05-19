import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Field } from '@/components/ui/Field'
import { PaymentsTabs } from './PaymentsTabs'
import { createPayment, getPayments, PAYMENT_METHODS, PAYMENT_REFERENCE_TYPES, type Payment } from '@/services/payments'
import { formatCurrency } from '@/utils/format'
import { toastError, toastSuccess } from '@/lib/toast'

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
  const { hasPermission, profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    reference_type: 'manual',
    reference_id: '',
    customer_id: '',
    payment_method: 'cash',
    amount: '',
    deposit_amount: '',
    due_date: '',
    proof_url: '',
    notes: '',
  })

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

  async function handleCreatePayment() {
    if (!businessId || !form.amount) return
    setSaving(true)
    try {
      const id = await createPayment(businessId, {
        customer_id: form.customer_id || undefined,
        reference_type: form.reference_type,
        reference_id: form.reference_id || undefined,
        payment_method: form.payment_method,
        amount: Number(form.amount),
        deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : undefined,
        due_date: form.due_date || undefined,
        proof_url: form.proof_url || undefined,
        notes: form.notes || undefined,
      })
      toastSuccess('Payment recorded')
      setForm({
        reference_type: 'manual',
        reference_id: '',
        customer_id: '',
        payment_method: 'cash',
        amount: '',
        deposit_amount: '',
        due_date: '',
        proof_url: '',
        notes: '',
      })
      setShowRecordForm(false)
      await load()
      if (id) navigate(`/business/payments/${id}`)
    } catch (error) {
      toastError(error, 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payments</h2>
        <p className="text-sm text-slate-500">Track, verify, and manage all payments.</p>
      </div>
      <PaymentsTabs />
      {hasPermission('payments.process') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Record payment</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Create a manual or mock gateway-ready payment record.</p>
            </div>
            <Button variant="outline" onClick={() => setShowRecordForm((current) => !current)}>
              {showRecordForm ? 'Close' : 'New payment'}
            </Button>
          </CardHeader>
          {showRecordForm && (
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Reference type" description="What this payment belongs to. Use manual for standalone payments.">
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.reference_type} onChange={(event) => setForm((current) => ({ ...current, reference_type: event.target.value }))}>
                  {PAYMENT_REFERENCE_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Reference ID" description="Optional UUID for booking, membership, POS order, or subscription.">
                <Input value={form.reference_id} onChange={(event) => setForm((current) => ({ ...current, reference_id: event.target.value }))} placeholder="Optional reference UUID" />
              </Field>
              <Field label="Customer ID" description="Optional customer UUID for customer payment history.">
                <Input value={form.customer_id} onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))} placeholder="Optional customer UUID" />
              </Field>
              <Field label="Payment method" description="Gateway methods are simulated for now and stored with gateway metadata.">
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.payment_method} onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}>
                  {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Amount" description="Total amount paid or requested for this payment record.">
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <Field label="Deposit amount" description="Optional deposit amount when this payment is only a booking deposit.">
                <Input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={(event) => setForm((current) => ({ ...current, deposit_amount: event.target.value }))} />
              </Field>
              <Field label="Due date" description="Optional due date for unpaid or pending payments.">
                <Input type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} />
              </Field>
              <Field label="Proof URL" description="Optional link to uploaded bank transfer or QR payment proof.">
                <Input value={form.proof_url} onChange={(event) => setForm((current) => ({ ...current, proof_url: event.target.value }))} placeholder="https://..." />
              </Field>
              <Field label="Notes" description="Internal note for staff reviewing this payment.">
                <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional note" />
              </Field>
              <div className="md:col-span-2 lg:col-span-3">
                <Button onClick={handleCreatePayment} disabled={saving || !form.amount}>
                  {saving ? 'Recording...' : 'Record payment'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
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
