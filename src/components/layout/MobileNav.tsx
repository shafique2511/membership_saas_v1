import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { businessNavItems } from '@/components/layout/navigation'
import { useAppContext } from '@/context/useAppContext'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const { hasModule, setSidebarOpen, sidebarOpen } = useAppContext()

  if (!sidebarOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        className="absolute inset-0 bg-slate-950/60"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl dark:bg-slate-950">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <p className="font-semibold">Luxantara Members</p>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="space-y-1 p-4">
          {businessNavItems.map((item) => {
            const enabled = item.module ? hasModule(item.module) : true
            return (
              <NavLink
                key={item.href}
                to={enabled ? item.href : '/business/upgrade'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium',
                    isActive && enabled
                      ? 'bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200'
                      : 'text-slate-600 dark:text-slate-300',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
