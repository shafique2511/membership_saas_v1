import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { PaymentsTabs } from './PaymentsTabs'
import { getInvoices, updateInvoiceStatus, type Invoice } from '@/services/payments'
import { formatCurrency } from '@/utils/format'

const statusVariant: Record<string, BadgeVariant> = {
  draft: 'muted',
  issued: 'warning',
  paid: 'default',
  partial: 'warning',
  overdue: 'danger',
  void: 'muted',
}

export function InvoicesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const i = await getInvoices(businessId)
    setInvoices(i)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleStatus(id: string, status: string) {
    await updateInvoiceStatus(id, status)
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Invoices</h2>
        <p className="text-sm text-slate-500">Generate and manage customer invoices.</p>
      </div>
      <PaymentsTabs />
      <Card>
        <CardHeader><CardTitle>All invoices</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due date</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="py-2 capitalize">{inv.reference_type ?? 'manual'}</td>
                    <td className="py-2 font-medium">{formatCurrency(Number(inv.total))}</td>
                    <td className="py-2"><Badge variant={statusVariant[inv.status] ?? 'muted'}>{inv.status}</Badge></td>
                    <td className="py-2 text-muted-foreground">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {inv.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatus(inv.id, 'issued')}>Issue</Button>
                        )}
                        {inv.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatus(inv.id, 'void')}>Void</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
