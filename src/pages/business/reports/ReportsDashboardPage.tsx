import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import { getDashboardSummary, type DashboardSummary } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

const summaryCards = [
  { key: 'revenue_today', label: 'Revenue Today', format: 'currency', icon: '💰' },
  { key: 'revenue_month', label: 'Revenue This Month', format: 'currency', icon: '📊' },
  { key: 'bookings_today', label: 'Bookings Today', format: 'number', icon: '📅' },
  { key: 'bookings_month', label: 'Bookings This Month', format: 'number', icon: '📋' },
  { key: 'active_members', label: 'Active Members', format: 'number', icon: '👥' },
  { key: 'low_stock', label: 'Low Stock Items', format: 'number', icon: '⚠️' },
  { key: 'pending_verifications', label: 'Pending Verifications', format: 'number', icon: '⏳' },
  { key: 'no_show_rate', label: 'No-Show Rate', format: 'percent', icon: '🚫' },
]

export function ReportsDashboardPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getDashboardSummary(businessId)
    setSummary(s)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reports Dashboard</h2>
        <p className="text-sm text-slate-500">Real-time business performance overview.</p>
      </div>
      <ReportTabs />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <span>{card.icon}</span>
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {card.format === 'currency'
                  ? formatCurrency(summary?.[card.key as keyof DashboardSummary] as number ?? 0)
                  : card.format === 'percent'
                  ? `${(summary?.[card.key as keyof DashboardSummary] as number ?? 0).toFixed(1)}%`
                  : (summary?.[card.key as keyof DashboardSummary] as number ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
