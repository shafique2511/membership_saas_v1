import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { POSTabs } from '@/pages/business/pos/POSTabs'
import { getOrders } from '@/services/pos'

const statusFilters = ['all', 'draft', 'completed', 'cancelled', 'refunded'] as const
const paymentFilters = ['all', 'paid', 'unpaid', 'partial', 'refunded'] as const

export function POSOrdersPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    setOrders(await getOrders(businessId, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      payment_status: paymentFilter === 'all' ? undefined : paymentFilter,
      search: search || undefined,
    }))
  }, [businessId, statusFilter, paymentFilter, search])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-sm text-slate-500">View and manage POS orders.</p>
        </div>
        <Link to="/business/pos/checkout"><Button>New order</Button></Link>
      </div>
      <POSTabs />

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === f ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
            >{f === 'all' ? 'All status' : f}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {paymentFilters.map((f) => (
            <button key={f} onClick={() => setPaymentFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${paymentFilter === f ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
            >{f === 'all' ? 'All payment' : f}</button>
          ))}
        </div>
        <Input placeholder="Search order..." value={search} onChange={(e) => setSearch(e.target.value)} className="ml-auto w-48" />
      </div>

      <DataTable
        columns={[
          { key: 'order_number', header: 'Order', render: (r) => <Link className="font-medium text-teal-700" to={`/business/pos/orders/${String(r.id)}`}>{String(r.order_number)}</Link> },
          { key: 'customers', header: 'Customer', render: (r) => {
            const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
            return c?.full_name ?? String(r.customer_name ?? 'Walk-in')
          }},
          { key: 'total_amount', header: 'Total', render: (r) => `RM ${Number(r.total_amount).toFixed(2)}` },
          { key: 'order_status', header: 'Status', render: (r) => <Badge variant={r.order_status === 'completed' ? undefined : 'muted'}>{String(r.order_status)}</Badge> },
          { key: 'payment_status', header: 'Payment', render: (r) => <Badge variant={r.payment_status === 'paid' ? undefined : 'muted'}>{String(r.payment_status)}</Badge> },
          { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
          { key: 'actions', header: '', render: (r) => <Link to={`/business/pos/orders/${String(r.id)}`}><Button size="sm" variant="outline">View</Button></Link> },
        ]}
        data={orders}
        emptyMessage="No orders found."
      />
    </div>
  )
}
