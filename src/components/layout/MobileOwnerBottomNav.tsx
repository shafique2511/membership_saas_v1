import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, CalendarPlus, Home, QrCode, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { cn } from '@/lib/utils'
import type { ModuleKey } from '@/types'

const items: Array<{ label: string; href: string; icon: LucideIcon; module?: ModuleKey }> = [
  { label: 'Home', href: '/business', icon: Home, module: 'core' },
  { label: 'Book', href: '/business/bookings?new=1', icon: CalendarPlus, module: 'booking' },
  { label: 'POS', href: '/business/pos/checkout', icon: ShoppingCart, module: 'pos' },
  { label: 'Scan', href: '/business/memberships?scan=1', icon: QrCode, module: 'membership' },
  { label: 'Sales', href: '/business/reports/financial', icon: BarChart3, module: 'reports' },
]

export function MobileOwnerBottomNav() {
  const { canAccessModule } = useAppContext()
  const location = useLocation()

  if (!location.pathname.startsWith('/business')) {
    return null
  }

  const availableItems = items.filter((item) => !item.module || canAccessModule(item.module))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-2 pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {availableItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={() =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium text-slate-500',
                  location.pathname === item.href.split('?')[0] && 'bg-slate-950 text-white dark:bg-emerald-300 dark:text-slate-950',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
