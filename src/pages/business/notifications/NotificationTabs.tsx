import { FileText, Send, History, Megaphone, Settings2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/business/notifications', label: 'Templates', icon: FileText },
  { href: '/business/notifications/send', label: 'Send', icon: Send },
  { href: '/business/notifications/log', label: 'Log', icon: History },
  { href: '/business/notifications/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { href: '/business/notifications/settings', label: 'Settings', icon: Settings2 },
]

export function NotificationTabs() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const isActive = path === t.href || (t.href !== '/business/notifications' && path.startsWith(t.href))
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
