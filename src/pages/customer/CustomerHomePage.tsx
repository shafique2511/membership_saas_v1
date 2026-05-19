import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getCustomerPoints, getCustomerUpcomingBooking, getCustomerMemberships, type CustomerMembership, type CustomerBooking, type CustomerPoints } from '@/services/customerPortal'
import { CalendarDays, WalletCards, Gift, Coins, Sparkles, ArrowRight } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'

export function CustomerHomePage() {
  const { customer, customerId, routeBase } = useCustomerAccount()
  const navigate = useNavigate()

  const [points, setPoints] = useState<CustomerPoints | null>(null)
  const [upcoming, setUpcoming] = useState<CustomerBooking | null>(null)
  const [memberships, setMemberships] = useState<CustomerMembership[]>([])

  const load = useCallback(async () => {
    if (!customerId) return
    const [p, u, m] = await Promise.all([
      getCustomerPoints(customerId).catch(() => null),
      getCustomerUpcomingBooking(customerId).catch(() => null),
      getCustomerMemberships(customerId).catch(() => []),
    ])
    setPoints(p)
    setUpcoming(u)
    setMemberships(m)
  }, [customerId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const activeMembership = memberships.find((m) => m.status === 'active')
  const nav = (path: string) => navigate(`${routeBase}${path}`)

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-gradient-to-br from-teal-700 to-emerald-800 p-5 text-white shadow-lg">
        <p className="text-sm text-teal-100">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold">{customer?.full_name ?? 'Guest'}</h2>
        {activeMembership ? (
          <div className="mt-4 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-teal-100">
              <Sparkles className="h-4 w-4" />
              <span>{activeMembership.plan_name}</span>
            </div>
            <p className="mt-1 text-xs text-teal-200">
              Valid until {new Date(activeMembership.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <div className="mt-2 flex gap-4 text-sm">
              {activeMembership.remaining_credit > 0 && (
                <div><span className="text-lg font-bold">RM {activeMembership.remaining_credit}</span><p className="text-[10px] text-teal-200">Credit left</p></div>
              )}
              {activeMembership.remaining_visits > 0 && (
                <div><span className="text-lg font-bold">{activeMembership.remaining_visits}</span><p className="text-[10px] text-teal-200">Visits left</p></div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-teal-100">No active membership</p>
        )}
      </section>

      <div className="grid grid-cols-4 gap-2">
        <Button variant="secondary" className="flex-col gap-1 py-3 h-auto" onClick={() => nav('/book')}>
          <CalendarDays className="h-5 w-5" />
          <span className="text-[10px]">Book</span>
        </Button>
        <Button variant="secondary" className="flex-col gap-1 py-3 h-auto" onClick={() => nav('/membership')}>
          <WalletCards className="h-5 w-5" />
          <span className="text-[10px]">Member</span>
        </Button>
        <Button variant="secondary" className="flex-col gap-1 py-3 h-auto" onClick={() => nav('/rewards')}>
          <Gift className="h-5 w-5" />
          <span className="text-[10px]">Rewards</span>
        </Button>
        <Button variant="secondary" className="flex-col gap-1 py-3 h-auto" onClick={() => nav('/points')}>
          <Coins className="h-5 w-5" />
          <span className="text-[10px]">Points</span>
        </Button>
      </div>

      {upcoming && (
        <Card className="cursor-pointer" onClick={() => nav('/history')}>
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <p className="text-xs text-slate-500">Next booking</p>
              <p className="mt-0.5 font-medium">{upcoming.service_name ?? 'Booking'}</p>
              <p className="text-xs text-slate-400">
                {new Date(upcoming.booking_date).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' '}{upcoming.start_time?.substring(0, 5)}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
          </CardContent>
        </Card>
      )}

      {points && (
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{points.points_balance}</p>
                <p className="text-xs text-slate-500">Points balance</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => nav('/points')}>View</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
