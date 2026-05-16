import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getRedeemableRewards, getCustomerPoints, type RedeemableReward, type CustomerPoints } from '@/services/customerPortal'
import { Gift, Coins } from 'lucide-react'

export function CustomerRewardsPage() {
  const { businessId } = useParams()
  const { profile } = useAppContext()
  const customerId = profile?.id ?? ''
  const bizId = businessId ?? profile?.business_id ?? ''

  const [rewards, setRewards] = useState<RedeemableReward[]>([])
  const [points, setPoints] = useState<CustomerPoints | null>(null)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!customerId || !bizId) return
    const [r, p] = await Promise.all([
      getRedeemableRewards(bizId),
      getCustomerPoints(customerId),
    ])
    setRewards(r)
    setPoints(p)
  }, [customerId, bizId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleRedeem(rewardId: string) {
    setRedeeming(rewardId)
    setMessage('')
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.rpc('redeem_loyalty_points', {
        p_customer_id: customerId,
        p_points: rewards.find((r) => r.id === rewardId)?.points_required ?? 0,
        p_description: 'Reward redemption',
      })
      if (error) throw error
      setMessage('Reward redeemed! Check your rewards.')
      await load()
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err))
    } finally {
      setRedeeming(null)
    }
  }

  const rewardIcons: Record<string, React.ReactNode> = {
    voucher: <Gift className="h-5 w-5" />,
    discount: <Gift className="h-5 w-5" />,
    free_service: <Gift className="h-5 w-5" />,
    free_item: <Gift className="h-5 w-5" />,
    birthday: <Gift className="h-5 w-5" />,
    referral: <Gift className="h-5 w-5" />,
  }

  return (
    <div className="space-y-4">
      {points && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{points.points_balance}</p>
              <p className="text-xs text-slate-500">Points available</p>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-700">{message}</div>
      )}

      {rewards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <Gift className="mx-auto mb-2 h-10 w-10" />
            <p>No rewards available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Redeem rewards</p>
          {rewards.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                      {rewardIcons[r.reward_type] ?? <Gift className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-medium">{r.name}</h3>
                      {r.description && <p className="text-xs text-slate-400">{r.description}</p>}
                      {r.discount_amount && <p className="text-xs text-slate-500">RM {r.discount_amount} off</p>}
                      {r.discount_percent && <p className="text-xs text-slate-500">{r.discount_percent}% off</p>}
                      {r.free_item && <p className="text-xs text-slate-500">Free {r.free_item}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-purple-700">{r.points_required} pts</p>
                  </div>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant={points && points.points_balance >= r.points_required ? 'default' : 'outline'}
                  disabled={!points || points.points_balance < r.points_required || redeeming === r.id}
                  onClick={() => handleRedeem(r.id)}
                >
                  {redeeming === r.id ? 'Redeeming...' : 'Redeem'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
