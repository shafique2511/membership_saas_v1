import { CreditCard, FileText, FileCheck, ReceiptText, Undo2, Settings2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/business/payments', label: 'Payments', icon: CreditCard },
  { href: '/business/payments/pending', label: 'Pending Verification', icon: FileCheck },
  { href: '/business/payments/invoices', label: 'Invoices', icon: FileText },
  { href: '/business/payments/receipts', label: 'Receipts', icon: ReceiptText },
  { href: '/business/payments/refunds', label: 'Refunds', icon: Undo2 },
  { href: '/business/payments/settings', label: 'Settings', icon: Settings2 },
]

export function PaymentsTabs() {
  const location = useLocation()
  const path = location.pathname

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const isActive = path === t.href || (t.href !== '/business/payments' && path.startsWith(t.href))
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
