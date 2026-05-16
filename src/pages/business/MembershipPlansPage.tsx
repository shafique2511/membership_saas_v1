import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getPlans, createPlan, updatePlan, deletePlan, planTypeLabels, type MembershipPlan, type PlanType } from '@/services/memberships'

export function MembershipPlansPage() {
  const { profile } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()
  const businessId = profile?.business_id ?? ''
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', plan_type: 'subscription' as PlanType, description: '', price: '0',
    duration_days: '30', credit_amount: '0', visit_limit: '', points_bonus: '0',
    discount_percent: '0', benefits: '',
  })

  const load = useCallback(async () => {
    if (!businessId) return
    setPlans(await getPlans(businessId))
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSubmit() {
    const payload = {
      business_id: businessId,
      name: form.name,
      plan_type: form.plan_type,
      description: form.description || null,
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      credit_amount: Number(form.credit_amount),
      visit_limit: form.visit_limit ? Number(form.visit_limit) : null,
      points_bonus: Number(form.points_bonus),
      discount_percent: Number(form.discount_percent),
    }
    if (editingId) {
      await updatePlan(editingId, payload)
    } else {
      await createPlan(payload)
    }
    setOpen(false)
    setEditingId(null)
    setForm({ name: '', plan_type: 'subscription', description: '', price: '0', duration_days: '30', credit_amount: '0', visit_limit: '', points_bonus: '0', discount_percent: '0', benefits: '' })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership plans"
        description="Create and manage subscription plans, prepaid credit, visit packages, and VIP memberships."
        actions={<Button onClick={() => { setEditingId(null); setOpen(true) }}>Create plan</Button>}
      />

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => navigate('/business/memberships')} className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${location.pathname === '/business/memberships' ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Members</button>
        <button onClick={() => navigate('/business/memberships/plans')} className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${location.pathname === '/business/memberships/plans' ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Plans</button>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Plan' },
          { key: 'plan_type', header: 'Type', render: (r) => <Badge variant="muted">{planTypeLabels[r.plan_type as PlanType] ?? String(r.plan_type)}</Badge> },
          { key: 'price', header: 'Price', render: (r) => `RM ${Number(r.price).toLocaleString()}` },
          { key: 'duration_days', header: 'Duration', render: (r) => `${r.duration_days} days` },
          { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'disabled'} /> },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setEditingId(String(r.id))
                setForm({
                  name: String(r.name ?? ''),
                  plan_type: String(r.plan_type) as PlanType,
                  description: String(r.description ?? ''),
                  price: String(r.price ?? '0'),
                  duration_days: String(r.duration_days ?? '30'),
                  credit_amount: String(r.credit_amount ?? '0'),
                  visit_limit: String(r.visit_limit ?? ''),
                  points_bonus: String(r.points_bonus ?? '0'),
                  discount_percent: String(r.discount_percent ?? '0'),
                  benefits: typeof r.benefits === 'object' ? JSON.stringify(r.benefits) : '',
                })
                setOpen(true)
              }}>Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => void updatePlan(String(r.id), { is_active: !r.is_active }).then(load)}>{r.is_active ? 'Disable' : 'Enable'}</Button>
              <Button size="sm" variant="destructive" onClick={() => void deletePlan(String(r.id)).then(load)}>Delete</Button>
            </div>
          )},
        ]}
        data={plans as unknown as Record<string, unknown>[]}
        emptyMessage="No membership plans yet."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.is_active ? '' : 'opacity-60'}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <Badge>{planTypeLabels[plan.plan_type]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {plan.description && <p className="text-slate-500">{plan.description}</p>}
              <p className="text-xl font-bold">RM {plan.price.toLocaleString()}</p>
              <p className="text-slate-500">{plan.duration_days} days</p>
              {plan.credit_amount > 0 && <p>RM {plan.credit_amount} credit</p>}
              {plan.visit_limit != null && <p>{plan.visit_limit} visits</p>}
              {plan.discount_percent > 0 && <p>{plan.discount_percent}% discount</p>}
              {plan.points_bonus > 0 && <p>+{plan.points_bonus} points</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <FormModal
        open={open}
        title={editingId ? 'Edit plan' : 'Create plan'}
        submitLabel={editingId ? 'Save' : 'Create'}
        onSubmit={handleSubmit}
        onOpenChange={(v) => { if (!v) { setOpen(false); setEditingId(null) }}}
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <Input placeholder="Plan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value as PlanType })}>
            {Object.entries(planTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea className="sm:col-span-2 h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="number" placeholder="Price (RM)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input type="number" placeholder="Duration (days)" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
          <Input type="number" placeholder="Credit amount (RM)" value={form.credit_amount} onChange={(e) => setForm({ ...form, credit_amount: e.target.value })} />
          <Input type="number" placeholder="Visit limit" value={form.visit_limit} onChange={(e) => setForm({ ...form, visit_limit: e.target.value })} />
          <Input type="number" placeholder="Points bonus" value={form.points_bonus} onChange={(e) => setForm({ ...form, points_bonus: e.target.value })} />
          <Input type="number" placeholder="Discount %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        </div>
      </FormModal>
    </div>
  )
}
