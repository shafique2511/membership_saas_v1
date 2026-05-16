import { Megaphone, Ticket, Users, Send, BarChart3 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/business/marketing', label: 'Campaigns', icon: Megaphone },
  { href: '/business/marketing/promos', label: 'Promo Codes', icon: Ticket },
  { href: '/business/marketing/segments', label: 'Segments', icon: Users },
  { href: '/business/marketing/broadcast', label: 'Broadcast', icon: Send },
  { href: '/business/marketing/report', label: 'Report', icon: BarChart3 },
]

export function MarketingTabs() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const isActive = path === t.href || (t.href !== '/business/marketing' && path.startsWith(t.href))
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
