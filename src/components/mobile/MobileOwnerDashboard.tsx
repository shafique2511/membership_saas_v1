import { Link } from 'react-router-dom'
import { Bell, CalendarPlus, CheckCircle2, MessageCircle, QrCode, ShoppingCart, UserPlus, WalletCards, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { toastError, toastSuccess } from '@/lib/toast'
import { transitionBooking } from '@/services/bookings'
import type { BusinessDashboardData, UpcomingBooking } from '@/services/businessDashboard'

interface MobileOwnerDashboardProps {
  data: BusinessDashboardData
  hasBooking: boolean
  hasMembership: boolean
  hasPos: boolean
  hasNotification: boolean
  hasReports: boolean
  onRefresh: () => Promise<void> | void
}

function formatCurrency(value: number) {
  return `RM ${Number(value ?? 0).toLocaleString()}`
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <Link to={to} className="min-w-0">
      <Button className="h-16 w-full justify-start gap-3 rounded-lg text-left text-sm" variant="outline">
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{label}</span>
      </Button>
    </Link>
  )
}

function BookingCard({ booking, onCheckedIn }: { booking: UpcomingBooking; onCheckedIn: () => void }) {
  async function checkIn() {
    try {
      await transitionBooking(booking.id, 'checked_in')
      await onCheckedIn()
      toastSuccess('Customer checked in')
    } catch (error) {
      toastError(error, 'Unable to check in customer')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{booking.customer}</p>
          <p className="mt-1 truncate text-sm text-slate-500">{booking.service}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{booking.time}</p>
          <div className="mt-1"><StatusBadge status={booking.status} /></div>
        </div>
      </div>
      {booking.status !== 'checked_in' ? (
        <Button className="mt-3 h-11 w-full" onClick={() => void checkIn()}>
          <CheckCircle2 className="h-4 w-4" />
          Check in customer
        </Button>
      ) : null}
    </div>
  )
}

export function MobileOwnerDashboard({
  data,
  hasBooking,
  hasMembership,
  hasPos,
  hasNotification,
  hasReports,
  onRefresh,
}: MobileOwnerDashboardProps) {
  const nextBookings = data.upcomingBookings.slice(0, 4)
  const notifications = data.recentActivity.filter((activity) => activity.table_name.includes('notification')).slice(0, 3)

  return (
    <div className="space-y-4 lg:hidden">
      <section>
        <p className="text-xs font-semibold uppercase text-slate-500">Owner mobile</p>
        <h1 className="mt-1 text-2xl font-semibold">Today</h1>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {hasBooking && <QuickAction to="/business/bookings?new=1" label="New Booking" icon={CalendarPlus} />}
        <QuickAction to="/business/customers?new=1" label="New Customer" icon={UserPlus} />
        {hasPos && <QuickAction to="/business/pos/checkout" label="Open POS" icon={ShoppingCart} />}
        {hasMembership && <QuickAction to="/business/memberships?scan=1" label="Scan Member QR" icon={QrCode} />}
        {hasNotification && <QuickAction to="/business/notifications/send" label="Send WhatsApp" icon={MessageCircle} />}
        {hasReports && <QuickAction to="/business/reports/financial" label="View Today Sales" icon={WalletCards} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Today bookings</p>
            <p className="mt-1 text-3xl font-semibold">{data.todayBookings.total}</p>
            <p className="mt-1 text-xs text-slate-500">{data.todayBookings.confirmed} confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Today sales</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(data.todaySales)}</p>
            <p className="mt-1 text-xs text-slate-500">{formatCurrency(data.monthlySales)} month</p>
          </CardContent>
        </Card>
      </div>

      {hasBooking && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Today bookings</CardTitle>
              <Link className="text-sm font-medium text-emerald-700 dark:text-emerald-300" to="/business/bookings">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextBookings.length ? (
              nextBookings.map((booking) => <BookingCard key={booking.id} booking={booking} onCheckedIn={onRefresh} />)
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-800">No more bookings today.</p>
            )}
          </CardContent>
        </Card>
      )}

      {hasMembership && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Membership scan</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/business/memberships?scan=1">
              <Button className="h-14 w-full">
                <QrCode className="h-5 w-5" />
                Scan or enter member QR
              </Button>
            </Link>
            <p className="mt-2 text-xs text-slate-500">{data.activeMembers} active members, {data.expiringMemberships} expiring soon.</p>
          </CardContent>
        </Card>
      )}

      {hasReports && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Sales summary</CardTitle>
              <Link className="text-sm font-medium text-emerald-700 dark:text-emerald-300" to="/business/reports/financial">Report</Link>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-lg font-semibold">{formatCurrency(data.todaySales)}</p><p className="text-xs text-slate-500">Today</p></div>
            <div><p className="text-lg font-semibold">{data.recentPayments.length}</p><p className="text-xs text-slate-500">Payments</p></div>
            <div><p className="text-lg font-semibold">{data.topProducts.length}</p><p className="text-xs text-slate-500">Products</p></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Notifications</CardTitle>
            {hasNotification && <Link className="text-sm font-medium text-emerald-700 dark:text-emerald-300" to="/business/notifications">Open</Link>}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length ? notifications.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 dark:bg-slate-900">
              <span className="truncate text-sm">{item.action}</span>
              <Badge variant="muted">{new Date(item.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</Badge>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No notification activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
