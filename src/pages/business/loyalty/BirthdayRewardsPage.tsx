import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { LoyaltyTabs } from '@/pages/business/loyalty/LoyaltyTabs'
import { getBirthdayRewards, getUpcomingBirthdays, awardBirthdayReward, getLoyaltySettings, type BirthdayReward } from '@/services/loyalty'

export function BirthdayRewardsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [rewards, setRewards] = useState<(BirthdayReward & { customers?: { full_name: string; birthday: string }[] })[]>([])
  const [upcoming, setUpcoming] = useState<{ id: string; full_name: string; birthday: string; phone: string | null }[]>([])
  const [birthdayPoints, setBirthdayPoints] = useState(100)

  const load = useCallback(async () => {
    if (!businessId) return
    setRewards(await getBirthdayRewards(businessId))
    setUpcoming(await getUpcomingBirthdays(businessId))
    const s = await getLoyaltySettings(businessId)
    if (s) setBirthdayPoints(s.birthday_reward_points)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleAward(customerId: string) {
    await awardBirthdayReward(businessId, customerId)
    await load()
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Birthday rewards</h2>
        <p className="text-sm text-slate-500">Award {birthdayPoints} points to customers on their birthday.</p>
      </div>
      <LoyaltyTabs />

      <Card>
        <CardHeader><CardTitle className="text-base">Upcoming birthdays (next 30 days)</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'full_name', header: 'Customer' },
              { key: 'birthday', header: 'Birthday', render: (r) => {
                if (!r.birthday) return '-'
                const d = new Date(String(r.birthday))
                return d.toLocaleDateString('en', { day: 'numeric', month: 'long' })
              }},
              { key: 'phone', header: 'Phone', render: (r) => String(r.phone ?? '-') },
              { key: 'actions', header: '', render: (r) => {
                const alreadyAwarded = rewards.some((rw) => rw.customer_id === r.id && rw.reward_year === currentYear && rw.status === 'awarded')
                if (alreadyAwarded) return <Badge>Awarded</Badge>
                return <Button size="sm" onClick={() => handleAward(String(r.id))}>Award {birthdayPoints} pts</Button>
              }},
            ]}
            data={upcoming as unknown as Record<string, unknown>[]}
            emptyMessage="No upcoming birthdays."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Awarded birthday rewards</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'reward_year', header: 'Year' },
              { key: 'customers', header: 'Customer', render: (r) => {
                const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
                return c?.full_name ?? 'Unknown'
              }},
              { key: 'points_awarded', header: 'Points' },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'awarded' ? undefined : 'muted'}>{String(r.status)}</Badge> },
              { key: 'awarded_at', header: 'Awarded', render: (r) => r.awarded_at ? new Date(String(r.awarded_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' },
            ]}
            data={rewards as unknown as Record<string, unknown>[]}
            emptyMessage="No birthday rewards yet."
          />
        </CardContent>
      </Card>
    </div>
  )
}
