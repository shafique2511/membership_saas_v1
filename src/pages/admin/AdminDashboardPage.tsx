import { useEffect, useState } from 'react'
import { Building2, CalendarDays, CreditCard, Package, Users, WalletCards } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminStats, type AdminStats } from '@/services/admin'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    void getAdminStats().then(setStats).catch(() => setStats(null))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="Super admin" description="Platform-level controls for tenants, packages, modules, and billing." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total businesses" value={String(stats?.totalBusinesses ?? 0)} hint={`${stats?.activeBusinesses ?? 0} active`} icon={Building2} />
        <StatCard label="Trial businesses" value={String(stats?.trialBusinesses ?? 0)} hint={`${stats?.cancelledBusinesses ?? 0} cancelled`} icon={Package} />
        <StatCard label="Monthly recurring revenue" value={`RM ${(stats?.monthlyRecurringRevenue ?? 0).toLocaleString()}`} hint="Active subscriptions" icon={CreditCard} />
        <StatCard label="Yearly recurring revenue" value={`RM ${(stats?.yearlyRecurringRevenue ?? 0).toLocaleString()}`} hint="Active subscriptions" icon={CreditCard} />
        <StatCard label="Total bookings" value={String(stats?.totalBookings ?? 0)} hint="All tenants" icon={CalendarDays} />
        <StatCard label="Total customers" value={String(stats?.totalCustomers ?? 0)} hint="All tenants" icon={Users} />
        <StatCard label="Total members" value={String(stats?.totalMembers ?? 0)} hint="Active and historical" icon={WalletCards} />
        <StatCard label="Active businesses" value={String(stats?.activeBusinesses ?? 0)} hint="Billable tenant base" icon={Building2} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats?.revenueByPackage ?? {}).length ? (
              Object.entries(stats?.revenueByPackage ?? {}).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-semibold">RM {amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No package revenue yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Module adoption rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats?.moduleAdoption ?? {}).slice(0, 8).map(([module, adoption]) => (
              <div key={module} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{module.replaceAll('_', ' ')}</span>
                  <span className="font-semibold">{adoption}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-teal-700 dark:bg-teal-300" style={{ width: `${adoption}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
