import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { label: 'Staff', href: '/business/staff/list' },
  { label: 'Calendar', href: '/business/staff/calendar' },
  { label: 'Commissions', href: '/business/staff/commissions' },
  { label: 'Commission report', href: '/business/staff/commission-report' },
  { label: 'Performance', href: '/business/staff/performance' },
] as const

export function StaffTabs() {
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
