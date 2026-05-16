import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import {
  getMembership, getUsage, recordUsage, updateMembership, freezeMembership,
  cancelMembership, renewMembership, getMembershipStatusColor, planTypeLabels,
  type Membership, type MembershipUsage, type PlanType,
} from '@/services/memberships'

export function MembershipDetailsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const { membershipId = '' } = useParams()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [usage, setUsage] = useState<MembershipUsage[]>([])
  const [openUsage, setOpenUsage] = useState(false)
  const [usageForm, setUsageForm] = useState({ usage_type: 'visit' as string, visits_used: '1', amount_used: '0', notes: '' })

  const load = useCallback(async () => {
    if (!membershipId) return
    const m = await getMembership(membershipId)
    setMembership(m)
    if (m) setUsage(await getUsage(membershipId))
  }, [membershipId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const plan = membership?.membership_plans
    ? (Array.isArray(membership.membership_plans) ? membership.membership_plans[0] : membership.membership_plans)
    : null
  const customer = membership?.customers
    ? (Array.isArray(membership.customers) ? membership.customers[0] : membership.customers)
    : null

  async function handleRecordUsage() {
    if (!membership) return
    await recordUsage({
      business_id: businessId,
      membership_id: membership.id,
      customer_id: membership.customer_id,
      usage_type: usageForm.usage_type as 'visit' | 'credit' | 'discount' | 'manual_adjustment',
      visits_used: Number(usageForm.visits_used),
      amount_used: Number(usageForm.amount_used),
      notes: usageForm.notes || undefined,
    })
    setOpenUsage(false)
    setUsageForm({ usage_type: 'visit', visits_used: '1', amount_used: '0', notes: '' })
    await load()
  }

  async function handleFreeze() {
    if (!membership) return
    await freezeMembership(membership.id)
    await load()
  }

  async function handleUnfreeze() {
    if (!membership) return
    await updateMembership(membership.id, { status: 'active' as const })
    await load()
  }

  async function handleCancel() {
    if (!membership) return
    await cancelMembership(membership.id)
    await load()
  }

  async function handleRenew() {
    if (!membership) return
    await renewMembership(membership.id)
    await load()
  }

  if (!membership) {
    return <div className="flex items-center justify-center py-20 text-slate-500">Loading membership...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${customer?.full_name ?? 'Unknown'} — ${plan?.name ?? 'Membership'}`}
        description={plan ? `${planTypeLabels[plan.plan_type as PlanType] ?? plan.plan_type} plan` : 'Membership details'}
        actions={
          <div className="flex flex-wrap gap-2">
            {membership.status === 'active' && <Button variant="outline" onClick={handleFreeze}>Freeze</Button>}
            {membership.status === 'frozen' && <Button variant="outline" onClick={handleUnfreeze}>Unfreeze</Button>}
            {(membership.status === 'active' || membership.status === 'expired') && <Button variant="outline" onClick={handleRenew}>Renew</Button>}
            {membership.status !== 'cancelled' && <Button variant="destructive" onClick={handleCancel}>Cancel</Button>}
            <Button onClick={() => setOpenUsage(true)}>Record usage</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Status</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getMembershipStatusColor(membership.status)}`}>{membership.status}</span>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Plan</p>
          <p className="mt-1 font-medium">{plan?.name ?? '-'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Period</p>
          <p className="mt-1 font-medium">{membership.start_date} → {membership.end_date}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Auto-renew</p>
          <p className="mt-1 font-medium">{membership.auto_renew ? 'Yes' : 'No'}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Remaining credit</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">RM {Number(membership.remaining_credit).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Remaining visits</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{membership.remaining_visits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>QR member card</CardTitle></CardHeader>
          <CardContent>
            {membership.qr_code ? (
              <div className="space-y-2">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-center">
                    <svg className="mx-auto h-20 w-20 text-slate-800 dark:text-slate-200" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="10" y="10" width="30" height="30" /><rect x="50" y="10" width="10" height="10" />
                      <rect x="10" y="50" width="10" height="10" /><rect x="30" y="50" width="30" height="10" />
                      <rect x="10" y="70" width="30" height="10" /><rect x="50" y="30" width="10" height="30" />
                      <rect x="70" y="10" width="20" height="20" /><rect x="70" y="40" width="10" height="10" />
                      <rect x="80" y="60" width="10" height="10" /><rect x="70" y="80" width="20" height="10" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-slate-400">ID: {membership.qr_code.slice(0, 16)}...</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No QR code generated.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {plan && (
        <Card>
          <CardHeader><CardTitle>Plan benefits</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {plan.discount_percent > 0 && <p>• {plan.discount_percent}% discount on services</p>}
            {plan.points_bonus > 0 && <p>• +{plan.points_bonus} loyalty points bonus</p>}
            {plan.credit_amount > 0 && <p>• RM {plan.credit_amount} prepaid credit</p>}
            {plan.visit_limit != null && <p>• {plan.visit_limit} visits included</p>}
            {!plan.discount_percent && !plan.points_bonus && !plan.credit_amount && plan.visit_limit == null &&
              <p className="text-slate-400">No additional benefits configured.</p>
            }
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Usage history</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'created_at', header: 'Date', render: (r) => {
                const d = new Date(String(r.created_at))
                return d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
              }},
              { key: 'usage_type', header: 'Type', render: (r) => <Badge variant="muted">{String(r.usage_type)}</Badge> },
              { key: 'visits_used', header: 'Visits', render: (r) => Number(r.visits_used) > 0 ? String(r.visits_used) : '-' },
              { key: 'amount_used', header: 'Amount', render: (r) => Number(r.amount_used) > 0 ? `RM ${Number(r.amount_used).toLocaleString()}` : '-' },
              { key: 'notes', header: 'Notes', render: (r) => String(r.notes ?? '-') },
            ]}
            data={usage as unknown as Record<string, unknown>[]}
            emptyMessage="No usage recorded yet."
          />
        </CardContent>
      </Card>

      <FormModal open={openUsage} title="Record usage" submitLabel="Record" onSubmit={handleRecordUsage} onOpenChange={(v) => { if (!v) setOpenUsage(false) }}>
        <div className="space-y-3">
          <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={usageForm.usage_type} onChange={(e) => setUsageForm({ ...usageForm, usage_type: e.target.value })}>
            <option value="visit">Visit</option>
            <option value="credit">Credit</option>
            <option value="discount">Discount</option>
            <option value="manual_adjustment">Manual adjustment</option>
          </select>
          <Input type="number" placeholder="Visits used" value={usageForm.visits_used} onChange={(e) => setUsageForm({ ...usageForm, visits_used: e.target.value })} />
          <Input type="number" placeholder="Amount used (RM)" value={usageForm.amount_used} onChange={(e) => setUsageForm({ ...usageForm, amount_used: e.target.value })} />
          <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Notes" value={usageForm.notes} onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })} />
        </div>
      </FormModal>
    </div>
  )
}
