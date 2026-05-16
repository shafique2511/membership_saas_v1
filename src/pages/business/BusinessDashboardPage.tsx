import { CalendarDays, DollarSign, Users, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { ModuleLock } from '@/components/modules/ModuleLock'

const bookings = [
  { customer: 'Aiman Rahman', service: 'Signature cut', time: '10:30 AM', status: 'confirmed' },
  { customer: 'Sarah Lim', service: 'Coffee tasting table', time: '12:00 PM', status: 'pending' },
  { customer: 'Devi Kumar', service: 'Membership renewal', time: '2:30 PM', status: 'paid' },
]

export function BusinessDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business dashboard"
        description="Monitor bookings, members, payments, and package-enabled modules from one workspace."
        actions={<Button>New booking</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today bookings" value="18" hint="7 checked in" trend="+12%" icon={CalendarDays} />
        <StatCard label="Sales" value="RM 3,420" hint="Today gross sales" trend="+8%" icon={DollarSign} />
        <StatCard label="Active members" value="264" hint="31 expiring soon" icon={WalletCards} />
        <StatCard label="Customers" value="1,840" hint="42 new this month" icon={Users} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'customer', header: 'Customer' },
                { key: 'service', header: 'Service' },
                { key: 'time', header: 'Time' },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
              ]}
              data={bookings}
            />
          </CardContent>
        </Card>
        <ModuleLock module="membership" moduleName="Membership module">
          <Card>
            <CardHeader>
              <CardTitle>Membership growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-end gap-3">
                {[38, 52, 44, 61, 74, 86, 96].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end rounded-md bg-teal-100 dark:bg-teal-500/10">
                    <div className="w-full rounded-md bg-teal-700 dark:bg-teal-300" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ModuleLock>
      </div>
    </div>
  )
}
