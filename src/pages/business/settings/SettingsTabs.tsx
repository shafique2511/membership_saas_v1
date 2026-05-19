import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/business/settings', label: 'Profile' },
  { href: '/business/settings/branches', label: 'Branches' },
  { href: '/business/settings/booking-rules', label: 'Booking' },
  { href: '/business/settings/membership', label: 'Membership' },
  { href: '/business/settings/loyalty', label: 'Loyalty' },
  { href: '/business/settings/payment', label: 'Payment' },
  { href: '/business/settings/notifications', label: 'Notifications' },
  { href: '/business/settings/staff-permissions', label: 'Staff' },
  { href: '/business/settings/module-access', label: 'Modules' },
  { href: '/business/settings/billing', label: 'Billing' },
  { href: '/business/settings/white-label', label: 'Branding' },
  { href: '/business/settings/account', label: 'Account' },
  { href: '/business/settings/security', label: 'Security' },
  { href: '/business/settings/data-ownership', label: 'Data & Backup' },
  { href: '/business/settings/import', label: 'CSV Import' },
  { href: '/business/settings/qr-codes', label: 'QR Codes' },
]

export function SettingsTabs() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const isActive = path === t.href
        return (
          <a
            key={t.href}
            href={t.href}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t.label}
          </a>
        )
      })}
    </div>
  )
}
