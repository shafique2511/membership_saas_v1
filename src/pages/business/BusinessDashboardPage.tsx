import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Trophy,
  TrendingUp,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import { getBusinessDashboard, type BusinessDashboardData } from '@/services/businessDashboard'

export function BusinessDashboardPage() {
  const { profile, hasModule } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [data, setData] = useState<BusinessDashboardData | null>(null)

  const hasBooking = hasModule('booking')
  const hasPayment = hasModule('payment')
  const hasMembership = hasModule('membership')
  const hasPos = hasModule('pos')
  const hasInventory = hasModule('inventory')
  const hasStaff = hasModule('staff_commission')

  const load = useCallback(async () => {
    if (!businessId) return
    setData(await getBusinessDashboard(businessId))
  }, [businessId])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Business dashboard" description="Loading your business data..." />
        <div className="flex items-center justify-center py-20 text-slate-500">Loading dashboard...</div>
      </div>
    )
  }

  const maxSales = Math.max(...data.salesOverview.map((s) => s.amount), 1)
  const maxBookingTrend = Math.max(...data.bookingTrend.map((b) => b.count), 1)
  const maxMembership = Math.max(...data.membershipGrowth.map((m) => m.count), 1)
  const bookingUpcoming = data.upcomingBookings.filter((b) => ['pending', 'confirmed', 'checked_in'].includes(b.status))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business dashboard"
        description="Monitor bookings, sales, members, inventory, and team performance."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today bookings" value={String(data.todayBookings.total)} hint={`${data.todayBookings.confirmed} confirmed`} icon={CalendarDays} />
        {hasPayment && <StatCard label="Today sales" value={`RM ${data.todaySales.toLocaleString()}`} hint={`RM ${data.monthlySales.toLocaleString()} this month`} icon={DollarSign} />}
        {hasMembership && <StatCard label="Active members" value={String(data.activeMembers)} hint={`${data.expiringMemberships} expiring soon`} icon={WalletCards} />}
        <StatCard label="New customers" value={String(data.newCustomersThisMonth)} hint="This month" icon={Users} />
        {hasPayment && <StatCard label="Monthly sales" value={`RM ${data.monthlySales.toLocaleString()}`} hint="Current month" icon={TrendingUp} />}
        <StatCard label="Pending" value={String(data.todayBookings.pending)} hint="Awaiting confirmation" icon={Clock} />
        <StatCard label="Completed" value={String(data.todayBookings.completed)} hint="Done today" icon={CheckCircle2} />
        <StatCard label="Cancelled" value={String(data.todayBookings.cancelled)} hint={`${data.todayBookings.noShow} no-show`} icon={XCircle} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {hasPayment && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Sales overview</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-2">
                {data.salesOverview.map((day, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-teal-700 dark:bg-teal-300" style={{ height: `${(day.amount / maxSales) * 100}%` }} />
                    <span className="text-[10px] text-slate-500">{day.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasBooking && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Booking trend</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-1">
                {data.bookingTrend.map((day, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-blue-600 dark:bg-blue-400" style={{ height: `${(day.count / maxBookingTrend) * 100}%` }} />
                    <span className="text-[10px] text-slate-500">{day.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasMembership && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-4 w-4" /> Membership growth</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-2">
                {data.membershipGrowth.map((month, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-purple-600 dark:bg-purple-400" style={{ height: `${(month.count / maxMembership) * 100}%` }} />
                    <span className="text-[10px] text-slate-500">{month.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Customer retention</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{data.customerRetention.totalActive}</p>
                <p className="text-xs text-slate-500">Active customers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.customerRetention.newCustomers}</p>
                <p className="text-xs text-slate-500">New this month</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.customerRetention.returningCustomers}</p>
                <p className="text-xs text-slate-500">Returning</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-700 dark:bg-teal-300"
                style={{ width: `${data.customerRetention.totalActive ? (data.customerRetention.returningCustomers / data.customerRetention.totalActive) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-slate-400">
              {data.customerRetention.totalActive
                ? `${Math.round((data.customerRetention.returningCustomers / data.customerRetention.totalActive) * 100)}% returning rate`
                : 'No customer data yet'}
            </p>
          </CardContent>
        </Card>

        {hasStaff && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4" /> Staff leaderboard</CardTitle></CardHeader>
            <CardContent>
              {data.staffPerformance.length > 0 ? (
                <div className="space-y-3">
                  {data.staffPerformance.map((staff, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{staff.name}</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-teal-700 dark:bg-teal-300"
                            style={{ width: `${data.staffPerformance.length > 0 ? (staff.bookingCount / data.staffPerformance[0].bookingCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{staff.bookingCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No staff performance data yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {hasBooking && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Upcoming bookings</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'customer', header: 'Customer' },
                  { key: 'service', header: 'Service' },
                  { key: 'time', header: 'Time' },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
                ]}
                data={bookingUpcoming as unknown as Record<string, unknown>[]}
                emptyMessage="No upcoming bookings today."
              />
            </CardContent>
          </Card>
        )}

        {hasPayment && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Recent payments</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'customer_name', header: 'Customer', render: (row) => String(row.customer_name ?? 'N/A') },
                  { key: 'amount', header: 'Amount', render: (row) => `RM ${Number(row.amount ?? 0).toLocaleString()}` },
                  { key: 'method', header: 'Method', render: (row) => <Badge variant="muted">{String(row.method)}</Badge> },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
                ]}
                data={data.recentPayments as unknown as Record<string, unknown>[]}
                emptyMessage="No payments yet."
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {hasInventory && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" /> Low stock alerts</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'name', header: 'Product' },
                  { key: 'stock', header: 'Stock', render: (row) => <span className="font-semibold text-red-600">{Number(row.stock)}</span> },
                  { key: 'threshold', header: 'Threshold', render: (row) => String(row.threshold) },
                ]}
                data={data.lowStockAlerts as unknown as Record<string, unknown>[]}
                emptyMessage="All products are well-stocked."
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Recent activity</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'action', header: 'Action' },
                { key: 'table_name', header: 'Module', render: (row) => <Badge variant="muted">{String(row.table_name)}</Badge> },
                { key: 'created_at', header: 'Time', render: (row) => {
                  const d = new Date(String(row.created_at))
                  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                }},
              ]}
              data={data.recentActivity as unknown as Record<string, unknown>[]}
              emptyMessage="No recent activity."
            />
          </CardContent>
        </Card>
      </div>

      {hasBooking && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top services</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name', header: 'Service' },
                { key: 'count', header: 'Bookings', render: (row) => <Badge>{String(row.count)}</Badge> },
              ]}
              data={data.topServices as unknown as Record<string, unknown>[]}
              emptyMessage="No service bookings yet."
            />
          </CardContent>
        </Card>
      )}

      {(hasPos || hasInventory) && data.topProducts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" /> Top products</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name', header: 'Product' },
                { key: 'count', header: 'Sold', render: (row) => <Badge>{String(row.count)}</Badge> },
              ]}
              data={data.topProducts as unknown as Record<string, unknown>[]}
              emptyMessage="No product sales yet."
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={() => void load()}>Refresh dashboard</Button>
      </div>
    </div>
  )
}
