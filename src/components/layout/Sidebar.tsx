import { NavLink } from 'react-router-dom'
import { LockKeyhole, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { businessNavItems } from '@/components/layout/navigation'
import { useAppContext } from '@/context/useAppContext'

export function Sidebar() {
  const { hasModule } = useAppContext()

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Luxantara Members</p>
          <p className="text-xs text-slate-500">Business suite</p>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {businessNavItems.map((item) => {
          const enabled = item.module ? hasModule(item.module) : true
          return (
            <NavLink
              key={item.href}
              to={enabled ? item.href : '/business/upgrade'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  isActive && enabled && 'bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {!enabled ? <LockKeyhole className="h-3.5 w-3.5 text-amber-600" /> : null}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
