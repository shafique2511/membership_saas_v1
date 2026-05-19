import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { customerBuyMembership, getCustomerMemberships, type CustomerMembership } from '@/services/customerPortal'
import { getPlans, type MembershipPlan } from '@/services/memberships'
import { WalletCards, Sparkles, CheckCircle, QrCode } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'
import { createQrDataUrl } from '@/utils/qr'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  expired: 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400',
  frozen: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  pending_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export function CustomerMembershipsPage() {
  const { businessId: bizId, customerId } = useCustomerAccount()

  const [memberships, setMemberships] = useState<CustomerMembership[]>([])
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [qrCards, setQrCards] = useState<Record<string, string>>({})
  const [showBuy, setShowBuy] = useState(false)
  const [buying, setBuying] = useState(false)

  const load = useCallback(async () => {
    if (!customerId || !bizId) return
    const [m, p] = await Promise.all([
      getCustomerMemberships(customerId),
      getPlans(bizId),
    ])
    setMemberships(m)
    setPlans(p)
  }, [customerId, bizId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])
  useEffect(() => {
    const codes = memberships.filter((m) => m.qr_code)
    if (codes.length === 0) {
      setQrCards({})
      return
    }
    let cancelled = false
    void Promise.all(codes.map(async (m) => [m.id, await createQrDataUrl(m.qr_code ?? '')] as const))
      .then((items) => {
        if (!cancelled) setQrCards(Object.fromEntries(items))
      })
      .catch(() => {
        if (!cancelled) setQrCards({})
      })
    return () => { cancelled = true }
  }, [memberships])

  async function handleBuy(planId: string) {
    if (!customerId || !bizId) return
    setBuying(true)
    try {
      await assignMembership({
        plan_id: planId,
        payment_method: 'cash',
      })
      setShowBuy(false)
      await load()
    } finally {
      setBuying(false)
    }
  }

  const activeMemberships = memberships.filter((m) => m.status === 'active')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Memberships</h2>
        <Button size="sm" onClick={() => setShowBuy(!showBuy)}>
          <Sparkles className="mr-1 h-4 w-4" /> Buy
        </Button>
      </div>

      {activeMemberships.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
          {activeMemberships.map((m) => (
            <Card key={m.id} className="border-teal-200 dark:border-teal-800">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <h3 className="font-semibold">{m.plan_name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 capitalize">{m.plan_type}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Valid until {new Date(m.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  {m.remaining_credit > 0 && (
                    <div>
                      <p className="text-lg font-bold text-teal-700">RM {m.remaining_credit}</p>
                      <p className="text-[10px] text-slate-400">Credit</p>
                    </div>
                  )}
                  {m.remaining_visits > 0 && (
                    <div>
                      <p className="text-lg font-bold text-teal-700">{m.remaining_visits}</p>
                      <p className="text-[10px] text-slate-400">Visits</p>
                    </div>
                  )}
                </div>
                {m.qr_code && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                    {qrCards[m.id] ? (
                      <img className="h-16 w-16 rounded bg-white" src={qrCards[m.id]} alt="Membership QR code" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-50 dark:bg-slate-800">
                        <QrCode className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 text-xs text-slate-500">
                      <p className="font-medium text-slate-700 dark:text-slate-200">Member card</p>
                      <p className="truncate">ID: {m.qr_code}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {memberships.filter((m) => m.status !== 'active').length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">History</p>
          {memberships.filter((m) => m.status !== 'active').map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-medium">{m.plan_name}</p>
                  <p className="text-xs text-slate-400">{m.status} - {new Date(m.end_date).toLocaleDateString()}</p>
                </div>
                <Badge className={STATUS_STYLES[m.status] ?? ''}>{m.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {memberships.length === 0 && !showBuy && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <WalletCards className="mx-auto mb-2 h-10 w-10" />
            <p>No memberships yet.</p>
            <Button className="mt-4" onClick={() => setShowBuy(true)}>Browse plans</Button>
          </CardContent>
        </Card>
      )}

      {showBuy && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available plans</p>
          {plans.map((p) => (
            <Card key={p.id} className="border-teal-100 dark:border-teal-900">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-teal-700">RM {p.price}</p>
                    <p className="text-[10px] text-slate-400">/{p.duration_days} days</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {p.credit_amount > 0 && <span>RM {p.credit_amount} credit</span>}
                  {p.visit_limit && <span>{p.visit_limit} visits</span>}
                  {p.points_bonus > 0 && <span>{p.points_bonus} bonus pts</span>}
                  {p.discount_percent > 0 && <span>{p.discount_percent}% discount</span>}
                </div>
                <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  Payment-ready: this creates a pending membership payment for staff or gateway confirmation.
                </p>
                <Button className="mt-3 w-full" onClick={() => handleBuy(p.id)} disabled={buying}>
                  {buying ? 'Processing...' : `Request membership RM ${p.price}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

async function assignMembership(input: {
  plan_id: string
  payment_method: string
}) {
  await customerBuyMembership(input.plan_id, input.payment_method)
}
