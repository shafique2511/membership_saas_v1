import { useCallback, useEffect, useState } from 'react'
import { Outlet, NavLink, useParams } from 'react-router-dom'
import { Home, CalendarDays, WalletCards, Gift, UserRound, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPublicBusiness, type PublicBusiness } from '@/services/customerPortal'
import { getWhiteLabelSettings, type WhiteLabelSettings } from '@/services/whiteLabel'

export function CustomerPortalLayout() {
  const { businessId } = useParams()
  const [business, setBusiness] = useState<PublicBusiness | null>(null)
  const [wl, setWl] = useState<WhiteLabelSettings | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const [b, w] = await Promise.all([
      getPublicBusiness(businessId),
      getWhiteLabelSettings(businessId),
    ])
    setBusiness(b)
    setWl(w)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const primary = wl?.primary_color ?? '#0f766e'
  const secondary = wl?.secondary_color ?? '#0d9488'
  const brandName = wl?.brand_name || business?.name || 'Luxantara Members'
  const logoUrl = wl?.logo_url || business?.logo_url
  const hideBranding = wl?.hide_platform_branding ?? false

  const customerTabs = [
    { label: 'Home', href: `/customer/${businessId}`, icon: Home },
    { label: 'Book', href: `/customer/${businessId}/book`, icon: CalendarDays },
    { label: 'Member', href: `/customer/${businessId}/membership`, icon: WalletCards },
    { label: 'Rewards', href: `/customer/${businessId}/rewards`, icon: Gift },
    { label: 'Profile', href: `/customer/${businessId}/profile`, icon: UserRound },
  ]

  return (
    <div
      className="mx-auto flex min-h-screen max-w-lg flex-col bg-white dark:bg-slate-950"
      style={{ '--wl-primary': primary, '--wl-secondary': secondary } as React.CSSProperties}
    >
      <header
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: `${primary}33`, background: `linear-gradient(135deg, ${primary}08, ${secondary}08)` }}
      >
        <NavLink to={`/customer/${businessId}`} className="opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft className="h-5 w-5" style={{ color: primary }} />
        </NavLink>
        {logoUrl && (
          <img src={logoUrl} alt="" className="h-8 w-8 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="flex-1 min-w-0">
          {!hideBranding && (
            <p className="text-[10px] uppercase tracking-widest" style={{ color: `${primary}99` }}>
              {business?.name ?? 'Luxantara Members'}
            </p>
          )}
          <h1 className="text-base font-semibold truncate">{brandName}</h1>
        </div>
      </header>
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-lg -translate-x-1/2 grid-cols-5 border-t bg-white pb-2 pt-1 dark:bg-slate-950" style={{ borderColor: `${primary}22` }}>
        {customerTabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            end={tab.href === `/customer/${businessId}`}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium transition-colors',
                isActive ? '' : 'text-slate-400',
              )
            }
            style={({ isActive }) => isActive ? { color: primary } : undefined}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {!hideBranding && (
        <div className="fixed bottom-16 left-1/2 z-30 -translate-x-1/2 text-[9px] text-slate-300 dark:text-slate-600">
          Powered by Luxantara Members
        </div>
      )}
    </div>
  )
}
