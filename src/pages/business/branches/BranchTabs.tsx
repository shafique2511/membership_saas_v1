import { LayoutDashboard, Info, Users, Calendar, Package, TrendingUp } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function BranchTabs() {
  const location = useLocation()
  const { branchId } = useParams()
  const path = location.pathname

  const tabs = [
    { href: `/business/branches/${branchId}`, label: 'Details', icon: Info },
    { href: `/business/branches/${branchId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/business/branches/${branchId}/staff`, label: 'Staff', icon: Users },
    { href: `/business/branches/${branchId}/bookings`, label: 'Bookings', icon: Calendar },
    { href: `/business/branches/${branchId}/inventory`, label: 'Inventory', icon: Package },
    { href: `/business/branches/comparison`, label: 'Comparison', icon: TrendingUp },
  ]

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const isActive = path === t.href || (path.startsWith(t.href) && t.href !== `/business/branches/${branchId}`)
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
