import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { label: 'Products', href: '/business/inventory/products' },
  { label: 'Suppliers', href: '/business/inventory/suppliers' },
  { label: 'Stock in', href: '/business/inventory/stock-in' },
  { label: 'Stock out', href: '/business/inventory/stock-out' },
  { label: 'Adjustments', href: '/business/inventory/adjustments' },
  { label: 'Transfers', href: '/business/inventory/transfers' },
  { label: 'Low stock', href: '/business/inventory/low-stock' },
  { label: 'Report', href: '/business/inventory/report' },
] as const

export function InventoryTabs() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = tabs.find((t) => location.pathname.startsWith(t.href))

  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button key={tab.href} onClick={() => navigate(tab.href)}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            active?.href === tab.href ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >{tab.label}</button>
      ))}
    </div>
  )
}
