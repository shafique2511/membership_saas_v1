import { NavLink, useLocation } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { businessNavSections, adminNavSections } from '@/components/layout/navigation'
import { useAppContext } from '@/context/useAppContext'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const { canAccessModule, setSidebarOpen, sidebarOpen } = useAppContext()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const sections = isAdmin ? adminNavSections : businessNavSections

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
      <div className="absolute inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col bg-white shadow-xl dark:bg-slate-950">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-amber-300 dark:bg-emerald-300 dark:text-slate-950">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Luxantara</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 pb-8">
          {sections.map((section) => {
            const items = section.items.filter((item) => !item.module || canAccessModule(item.module))
            if (items.length === 0) return null
            return (
              <div key={section.title}>
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
                          isActive
                            ? 'bg-slate-950 text-white dark:bg-emerald-300 dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-300',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
