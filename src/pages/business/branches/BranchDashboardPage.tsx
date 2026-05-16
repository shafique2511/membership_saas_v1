import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBranchDashboard } from '@/services/branches'
import { BranchTabs } from './BranchTabs'
import { DollarSign, Calendar, ShoppingCart, Users } from 'lucide-react'

export function BranchDashboardPage() {
  const { branchId } = useParams()
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [data, setData] = useState<Awaited<ReturnType<typeof getBranchDashboard>>>(null)

  const load = useCallback(async () => {
    if (!branchId || !businessId) return
    const d = await getBranchDashboard(branchId, businessId)
    setData(d)
  }, [branchId, businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!data) return <div className="p-6 text-sm text-slate-400">Loading...</div>

  const { branch, stats, todayBookings, recentOrders } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">{branch.name} Dashboard</h2>
          <p className="text-sm text-slate-500">Real-time branch performance</p>
        </div>
      </div>

      <BranchTabs />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">RM {(stats.revenue ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500">Total revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.booking_count}</p>
              <p className="text-xs text-slate-500">Total bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.customer_count}</p>
              <p className="text-xs text-slate-500">Active customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ShoppingCart className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{todayBookings}</p>
              <p className="text-xs text-slate-500">Today's bookings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Payment</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="p-3">{o.order_number}</td>
                    <td className="p-3">RM {(o.total_amount ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant={o.payment_status === 'paid' ? 'default' : 'muted'}>{o.payment_status}</Badge>
                    </td>
                    <td className="p-3 text-slate-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
