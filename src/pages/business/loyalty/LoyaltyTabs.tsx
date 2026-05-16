import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { label: 'Settings', href: '/business/loyalty/settings' },
  { label: 'Rewards', href: '/business/loyalty/rewards' },
  { label: 'Points', href: '/business/loyalty/points' },
  { label: 'History', href: '/business/loyalty/history' },
  { label: 'Birthday', href: '/business/loyalty/birthday' },
  { label: 'Referrals', href: '/business/loyalty/referrals' },
] as const

export function LoyaltyTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          onClick={() => navigate(tab.href)}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            location.pathname === tab.href ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
