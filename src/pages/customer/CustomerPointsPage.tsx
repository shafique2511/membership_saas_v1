import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCustomerPoints } from '@/services/customerPortal'
import { supabase } from '@/lib/supabase'
import { Coins, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'

interface PointsTx {
  id: string
  transaction_type: string
  points: number
  description: string | null
  created_at: string
}

export function CustomerPointsPage() {
  const { customerId } = useCustomerAccount()

  const [points, setPoints] = useState<{ points_balance: number; total_earned: number; total_redeemed: number; total_expired: number } | null>(null)
  const [history, setHistory] = useState<PointsTx[]>([])

  const load = useCallback(async () => {
    if (!customerId) return
    const [p, h] = await Promise.all([
      getCustomerPoints(customerId),
      supabase
        .from('loyalty_transactions')
        .select('id, transaction_type, points, description, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50)
        .then((res) => ({ data: (res.data ?? []) as PointsTx[], error: res.error })),
    ])
    setPoints(p)
    setHistory(h.data ?? [])
  }, [customerId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const txIcons: Record<string, ReactNode> = {
    earn: <TrendingUp className="h-4 w-4 text-green-500" />,
    redeem: <TrendingDown className="h-4 w-4 text-red-500" />,
    adjust: <RotateCcw className="h-4 w-4 text-blue-500" />,
    expire: <RotateCcw className="h-4 w-4 text-slate-400" />,
  }

  const txColors: Record<string, string> = {
    earn: 'text-green-600',
    redeem: 'text-red-600',
    adjust: 'text-blue-600',
    expire: 'text-slate-400',
  }

  return (
    <div className="space-y-4">
      {points && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <Coins className="mx-auto mb-1 h-6 w-6 text-amber-500" />
              <p className="text-2xl font-bold">{points.points_balance}</p>
              <p className="text-xs text-slate-500">Balance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingUp className="mx-auto mb-1 h-6 w-6 text-green-500" />
              <p className="text-2xl font-bold text-green-600">+{points.total_earned}</p>
              <p className="text-xs text-slate-500">Total earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <TrendingDown className="mx-auto mb-1 h-6 w-6 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{points.total_redeemed}</p>
              <p className="text-xs text-slate-500">Redeemed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <RotateCcw className="mx-auto mb-1 h-6 w-6 text-slate-400" />
              <p className="text-2xl font-bold text-slate-400">{points.total_expired}</p>
              <p className="text-xs text-slate-500">Expired</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Transaction history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              <Coins className="mx-auto mb-2 h-8 w-8" />
              No transactions yet.
            </div>
          ) : (
            <div className="divide-y">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {txIcons[tx.transaction_type] ?? <RotateCcw className="h-4 w-4" />}
                    <div>
                      <p className="text-sm font-medium">{tx.description ?? tx.transaction_type}</p>
                      <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${txColors[tx.transaction_type] ?? ''}`}>
                    {tx.transaction_type === 'earn' ? '+' : '-'}{Math.abs(tx.points)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
