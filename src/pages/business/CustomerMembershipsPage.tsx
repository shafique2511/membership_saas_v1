import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { getPlans, getMemberships, assignMembership, getMembershipStatusColor, searchCustomers, type Membership, type MembershipStatus } from '@/services/memberships'

const statusFilters: (MembershipStatus | 'all')[] = ['all', 'active', 'expired', 'frozen', 'cancelled', 'pending_payment']

export function CustomerMembershipsPage() {
  const { profile } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  const businessId = profile?.business_id ?? ''
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [plans, setPlans] = useState<Record<string, unknown>[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<{ id: string; full_name: string; phone: string | null }[]>([])
  const [form, setForm] = useState({
    customer_id: '', plan_id: '', start_date: new Date().toISOString().slice(0, 10),
    auto_renew: false, customer_name: '',
  })

  const load = useCallback(async () => {
    if (!businessId) return
    const filters: Record<string, unknown> = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    setMemberships(await getMemberships(businessId, filters))
  }, [businessId, statusFilter])

  const loadPlans = useCallback(async () => {
    if (!businessId) return
    setPlans(await getPlans(businessId) as unknown as Record<string, unknown>[])
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => { void load(); void loadPlans() }, 0); return () => window.clearTimeout(t) }, [load, loadPlans])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return }
    const t = window.setTimeout(async () => { setCustomerResults(await searchCustomers(businessId, customerSearch)) }, 300)
    return () => window.clearTimeout(t)
  }, [customerSearch, businessId])

  async function handleAssign() {
    await assignMembership({
      business_id: businessId,
      customer_id: form.customer_id,
      plan_id: form.plan_id,
      start_date: form.start_date,
      auto_renew: form.auto_renew,
    })
    setOpen(false)
    setForm({ customer_id: '', plan_id: '', start_date: new Date().toISOString().slice(0, 10), auto_renew: false, customer_name: '' })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer memberships"
        description="Assign memberships, manage status, renewals, and view usage."
        actions={<Button onClick={() => setOpen(true)}>Assign membership</Button>}
      />

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => navigate('/business/memberships')} className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${location.pathname === '/business/memberships' ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Members</button>
        <button onClick={() => navigate('/business/memberships/plans')} className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${location.pathname === '/business/memberships/plans' ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Plans</button>
      </div>

      <div className="flex gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'customers', header: 'Customer', render: (r) => {
            const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
            return <Link className="font-medium text-teal-700" to={`/business/memberships/${String(r.id)}`}>{c?.full_name ?? 'Unknown'}</Link>
          }},
          { key: 'membership_plans', header: 'Plan', render: (r) => {
            const p = Array.isArray(r.membership_plans) ? r.membership_plans[0] : r.membership_plans
            return p?.name ?? '-'
          }},
          { key: 'status', header: 'Status', render: (r) => {
            const cls = getMembershipStatusColor(String(r.status))
            return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{String(r.status)}</span>
          }},
          { key: 'start_date', header: 'Start' },
          { key: 'end_date', header: 'End' },
          { key: 'remaining_credit', header: 'Credit', render: (r) => `RM ${Number(r.remaining_credit).toLocaleString()}` },
          { key: 'remaining_visits', header: 'Visits', render: (r) => String(r.remaining_visits ?? '-') },
        ]}
        data={memberships as unknown as Record<string, unknown>[]}
        emptyMessage="No memberships found."
      />

      <FormModal open={open} title="Assign membership" submitLabel="Assign" onSubmit={handleAssign} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <div className="space-y-3">
          {form.customer_id ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-2 dark:border-slate-700">
              <span className="text-sm font-medium">{form.customer_name}</span>
              <button type="button" className="text-xs text-slate-400" onClick={() => setForm({ ...form, customer_id: '', customer_name: '' })}>Change</button>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Search customer</label>
              <Input placeholder="Name, phone or email..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              {customerResults.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                  {customerResults.map((c) => (
                    <button key={c.id} type="button" onClick={() => setForm({ ...form, customer_id: c.id, customer_name: c.full_name })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <span className="font-medium">{c.full_name}</span>
                      {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Plan</label>
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
              <option value="">Select plan</option>
              {plans.filter((p) => p.is_active).map((p: Record<string, unknown>) => (
                <option key={String(p.id)} value={String(p.id)}>{String(p.name)} — RM {Number(p.price).toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Start date</label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} />
            Auto-renew
          </label>
        </div>
      </FormModal>
    </div>
  )
}
