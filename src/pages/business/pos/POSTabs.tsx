import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { label: 'Checkout', href: '/business/pos/checkout' },
  { label: 'Orders', href: '/business/pos/orders' },
  { label: 'Receipts', href: '/business/pos/receipts' },
  { label: 'Daily closing', href: '/business/pos/closing' },
  { label: 'Refunds', href: '/business/pos/refunds' },
] as const

export function POSTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  const active = tabs.find((t) => location.pathname.startsWith(t.href))

  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          onClick={() => navigate(tab.href)}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            active?.href === tab.href ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
