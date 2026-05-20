import { LayoutDashboard, DollarSign, CalendarCheck, Users, UserCheck, Star, Briefcase, Package, CreditCard, TrendingUp, Download, Ban, Building2, Megaphone, ReceiptText } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/business/reports', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/business/reports/financial', label: 'Financial', icon: ReceiptText },
  { href: '/business/reports/sales', label: 'Sales', icon: DollarSign },
  { href: '/business/reports/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/business/reports/memberships', label: 'Memberships', icon: Users },
  { href: '/business/reports/customers', label: 'Customers', icon: UserCheck },
  { href: '/business/reports/loyalty', label: 'Loyalty', icon: Star },
  { href: '/business/reports/staff', label: 'Staff', icon: Briefcase },
  { href: '/business/reports/inventory', label: 'Inventory', icon: Package },
  { href: '/business/reports/payments', label: 'Payments', icon: CreditCard },
  { href: '/business/reports/profit', label: 'Profit', icon: TrendingUp },
  { href: '/business/reports/no-shows', label: 'No-shows', icon: Ban },
  { href: '/business/reports/branches', label: 'Branches', icon: Building2 },
  { href: '/business/reports/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/business/reports/export', label: 'Export', icon: Download },
]

export function ReportTabs() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const isActive = path === t.href || (t.href !== '/business/reports' && path.startsWith(t.href))
        return (
          <a
            key={t.href}
            href={t.href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </a>
        )
      })}
    </div>
  )
}
