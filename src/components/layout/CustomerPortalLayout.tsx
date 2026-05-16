import { Outlet } from 'react-router-dom'
import { CalendarDays, Gift, Home, UserRound, WalletCards } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const customerTabs = [
  { label: 'Home', href: '/customer', icon: Home },
  { label: 'Book', href: '/customer/booking', icon: CalendarDays },
  { label: 'Member', href: '/customer/membership', icon: WalletCards },
  { label: 'Rewards', href: '/customer/rewards', icon: Gift },
  { label: 'Profile', href: '/customer/profile', icon: UserRound },
]

export function CustomerPortalLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 p-4 dark:border-slate-800">
        <p className="text-xs uppercase tracking-wide text-slate-500">Luxantara Members</p>
        <h1 className="text-xl font-semibold">Demo Coffee Bar</h1>
      </header>
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-lg -translate-x-1/2 grid-cols-5 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {customerTabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-medium text-slate-500',
                isActive && 'text-teal-700 dark:text-teal-300',
              )
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
