import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { LoyaltyTabs } from '@/pages/business/loyalty/LoyaltyTabs'
import { getCustomerPoints, adjustPoints, getPointsHistory, type PointsTransaction } from '@/services/loyalty'

export function CustomerPointsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [customers, setCustomers] = useState<{ id: string; full_name: string; phone: string | null; email: string | null; points_balance: number; lifetime_points: number }[]>([])
  const [search, setSearch] = useState('')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; full_name: string; points_balance: number } | null>(null)
  const [adjustPointsVal, setAdjustPointsVal] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<(PointsTransaction & { customers?: { full_name: string }[] })[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    setCustomers(await getCustomerPoints(businessId, { search: search || undefined }))
  }, [businessId, search])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleAdjust() {
    if (!selectedCustomer) return
    const points = Number(adjustPointsVal)
    if (isNaN(points) || points === 0) return
    await adjustPoints({
      business_id: businessId,
      customer_id: selectedCustomer.id,
      points,
      description: adjustReason || 'Manual adjustment',
    })
    setAdjustOpen(false)
    setAdjustPointsVal('')
    setAdjustReason('')
    setSelectedCustomer(null)
    await load()
  }

  async function showHistory(customerId: string) {
    setHistory(await getPointsHistory(businessId, { customer_id: customerId }))
    setHistoryOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Customer points</h2>
          <p className="text-sm text-slate-500">View and adjust loyalty points for customers.</p>
        </div>
        <div className="w-64">
          <Input placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <LoyaltyTabs />

      <DataTable
        columns={[
          { key: 'full_name', header: 'Customer' },
          { key: 'phone', header: 'Phone', render: (r) => String(r.phone ?? '-') },
          { key: 'points_balance', header: 'Points', render: (r) => <span className="font-bold text-teal-700">{String(r.points_balance)}</span> },
          { key: 'lifetime_points', header: 'Lifetime' },
          { key: 'actions', header: '', render: (r) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => showHistory(String(r.id))}>History</Button>
              <Button size="sm" onClick={() => {
                setSelectedCustomer({ id: String(r.id), full_name: String(r.full_name), points_balance: Number(r.points_balance) })
                setAdjustOpen(true)
              }}>Adjust</Button>
            </div>
          )},
        ]}
        data={customers}
        emptyMessage="No customers found."
      />

      <FormModal
        open={adjustOpen}
        title={`Adjust points — ${selectedCustomer?.full_name ?? ''}`}
        submitLabel="Adjust"
        onSubmit={handleAdjust}
        onOpenChange={(v) => { if (!v) setAdjustOpen(false) }}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Current balance: <span className="font-bold text-teal-700">{selectedCustomer?.points_balance ?? 0} points</span></p>
          <Input type="number" placeholder="Points (positive to add, negative to deduct)" value={adjustPointsVal} onChange={(e) => setAdjustPointsVal(e.target.value)} />
          <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Reason for adjustment" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
        </div>
      </FormModal>

      <FormModal
        open={historyOpen}
        title="Points history"
        submitLabel=""
        onSubmit={() => {}}
        onOpenChange={(v) => { if (!v) setHistoryOpen(false) }}
      >
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {history.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No transactions.</p>}
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3 text-sm dark:border-slate-800">
              <div>
                <span className={`inline-block w-16 rounded px-1.5 py-0.5 text-xs font-medium ${
                  t.transaction_type === 'earn' ? 'bg-green-100 text-green-700' :
                  t.transaction_type === 'redeem' ? 'bg-red-100 text-red-700' :
                  t.transaction_type === 'adjust' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>{t.transaction_type}</span>
                <span className="ml-2 text-slate-500">{t.description ?? '-'}</span>
              </div>
              <div className="text-right">
                <span className={`font-medium ${(t.points ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(t.points ?? 0) > 0 ? '+' : ''}{t.points}
                </span>
                {t.balance_after != null && <span className="ml-2 text-xs text-slate-400">→ {t.balance_after}</span>}
              </div>
            </div>
          ))}
        </div>
      </FormModal>
    </div>
  )
}
