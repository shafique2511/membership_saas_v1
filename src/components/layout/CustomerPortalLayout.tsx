import { useCallback, useEffect, useState } from 'react'
import { Outlet, NavLink, useParams } from 'react-router-dom'
import { Home, CalendarDays, WalletCards, Gift, UserRound, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPublicBusiness, type PublicBusiness } from '@/services/customerPortal'

export function CustomerPortalLayout() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState<PublicBusiness | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const b = await getPublicBusiness(businessId)
    setBusiness(b)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const customerTabs = [
    { label: 'Home', href: `/customer/${businessId}`, icon: Home },
    { label: 'Book', href: `/customer/${businessId}/book`, icon: CalendarDays },
    { label: 'Member', href: `/customer/${businessId}/membership`, icon: WalletCards },
    { label: 'Rewards', href: `/customer/${businessId}/rewards`, icon: Gift },
    { label: 'Profile', href: `/customer/${businessId}/profile`, icon: UserRound },
  ]

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-white dark:bg-slate-950">
      <header className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <NavLink to={`/customer/${businessId}`} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </NavLink>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{business?.name ?? 'Luxantara Members'}</p>
          <h1 className="text-base font-semibold">{business?.name ?? 'Loading...'}</h1>
        </div>
      </header>
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-lg -translate-x-1/2 grid-cols-5 border-t border-slate-200 bg-white pb-2 pt-1 dark:border-slate-800 dark:bg-slate-950">
        {customerTabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            end={tab.href === `/customer/${businessId}`}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium text-slate-400 transition-colors',
                isActive && 'text-teal-700 dark:text-teal-300',
              )
            }
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
