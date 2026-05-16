import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { DataTable } from '@/components/ui/DataTable'
import { LoyaltyTabs } from '@/pages/business/loyalty/LoyaltyTabs'
import { getPointsHistory, type PointsTransaction } from '@/services/loyalty'

const typeFilters = ['all', 'earn', 'redeem', 'adjust', 'expire'] as const

export function PointsHistoryPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [history, setHistory] = useState<(PointsTransaction & { customers?: { full_name: string }[] })[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const load = useCallback(async () => {
    if (!businessId) return
    setHistory(await getPointsHistory(businessId, {
      transaction_type: typeFilter === 'all' ? undefined : typeFilter,
    }))
  }, [businessId, typeFilter])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Points history</h2>
        <p className="text-sm text-slate-500">All loyalty points transactions across customers.</p>
      </div>
      <LoyaltyTabs />

      <div className="flex gap-2">
        {typeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              typeFilter === f ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >{f === 'all' ? 'All' : f}</button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'created_at', header: 'Date', render: (r) => new Date(String(r.created_at)).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
          { key: 'customers', header: 'Customer', render: (r) => {
            const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
            return c?.full_name ?? 'Unknown'
          }},
          { key: 'transaction_type', header: 'Type', render: (r) => {
            const cls = r.transaction_type === 'earn' ? 'bg-green-100 text-green-700' :
              r.transaction_type === 'redeem' ? 'bg-red-100 text-red-700' :
              r.transaction_type === 'adjust' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{String(r.transaction_type)}</span>
          }},
          { key: 'points', header: 'Points', render: (r) => {
            const pts = Number(r.points ?? 0)
            return <span className={`font-medium ${pts > 0 ? 'text-green-600' : pts < 0 ? 'text-red-600' : ''}`}>{pts > 0 ? '+' : ''}{pts}</span>
          }},
          { key: 'balance_after', header: 'Balance', render: (r) => r.balance_after != null ? String(r.balance_after) : '-' },
          { key: 'reference_type', header: 'Reference', render: (r) => String(r.reference_type ?? '-') },
          { key: 'description', header: 'Notes', render: (r) => String(r.description ?? '-') },
        ]}
        data={history as unknown as Record<string, unknown>[]}
        emptyMessage="No points transactions yet."
      />
    </div>
  )
}
