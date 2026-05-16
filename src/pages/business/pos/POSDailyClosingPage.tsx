import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { POSTabs } from '@/pages/business/pos/POSTabs'
import { getDailyClosing, openDailyClosing, closeDailyClosing, getDailyClosings, getTodaySalesSummary, type DailyClosing } from '@/services/pos'

export function POSDailyClosingPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [closing, setClosing] = useState<DailyClosing | null>(null)
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [history, setHistory] = useState<DailyClosing[]>([])
  const [closeOpen, setCloseOpen] = useState(false)
  const [closingBalance, setClosingBalance] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    setClosing(await getDailyClosing(businessId) as DailyClosing | null)
    setSummary(await getTodaySalesSummary(businessId))
    setHistory(await getDailyClosings(businessId) as DailyClosing[])
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  useEffect(() => {
    if (summary && Object.keys(summary).length > 0) {
      setClosingBalance(String(summary.totalSales ?? 0))
    }
  }, [summary])

  async function handleOpen() {
    await openDailyClosing(businessId)
    await load()
  }

  async function handleClose() {
    setSaving(true)
    await closeDailyClosing(businessId, {
      closing_balance: Number(closingBalance),
      cash_sales: summary.cashSales ?? 0,
      qr_sales: summary.qrSales ?? 0,
      card_sales: summary.cardSales ?? 0,
      credit_sales: summary.creditSales ?? 0,
      points_sales: summary.pointsSales ?? 0,
      total_sales: summary.totalSales ?? 0,
      total_orders: summary.totalOrders ?? 0,
      total_discounts: summary.totalDiscounts ?? 0,
      total_refunds: summary.totalRefunds ?? 0,
      notes: closingNotes || undefined,
    })
    setSaving(false)
    setCloseOpen(false)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Daily closing</h2>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {!closing || closing.status === 'closed' ? (
          <Button onClick={handleOpen}>Open register</Button>
        ) : (
          <Button onClick={() => setCloseOpen(true)}>Close register</Button>
        )}
      </div>
      <POSTabs />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Status</p><p className={`mt-1 text-lg font-bold ${closing?.status === 'open' ? 'text-green-600' : 'text-slate-500'}`}>{closing?.status === 'open' ? 'Open' : 'Closed'}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total sales</p><p className="mt-1 text-lg font-bold text-teal-700">RM {Number(summary.totalSales ?? 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Orders</p><p className="mt-1 text-lg font-bold">{summary.totalOrders ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Refunds</p><p className="mt-1 text-lg font-bold text-red-600">RM {Number(summary.totalRefunds ?? 0).toFixed(2)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Cash</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">RM {Number(summary.cashSales ?? 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">QR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">RM {Number(summary.qrSales ?? 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Card</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">RM {Number(summary.cardSales ?? 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Prepaid credit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">RM {Number(summary.creditSales ?? 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Points redemption</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">RM {Number(summary.pointsSales ?? 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Discounts given</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">RM {Number(summary.totalDiscounts ?? 0).toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Closing history</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'closing_date', header: 'Date' },
              { key: 'status', header: 'Status', render: (r) => <span className={`font-medium ${r.status === 'open' ? 'text-green-600' : 'text-slate-500'}`}>{String(r.status)}</span> },
              { key: 'total_sales', header: 'Sales', render: (r) => `RM ${Number(r.total_sales).toFixed(2)}` },
              { key: 'total_orders', header: 'Orders' },
              { key: 'cash_sales', header: 'Cash', render: (r) => `RM ${Number(r.cash_sales).toFixed(2)}` },
              { key: 'qr_sales', header: 'QR', render: (r) => `RM ${Number(r.qr_sales).toFixed(2)}` },
              { key: 'card_sales', header: 'Card', render: (r) => `RM ${Number(r.card_sales).toFixed(2)}` },
              { key: 'closed_at', header: 'Closed', render: (r) => r.closed_at ? new Date(String(r.closed_at)).toLocaleDateString('en', { hour: '2-digit', minute: '2-digit' }) : '-' },
            ]}
            data={history as unknown as Record<string, unknown>[]}
            emptyMessage="No closing records."
          />
        </CardContent>
      </Card>

      <FormModal open={closeOpen} title="Close register" submitLabel="Close" onSubmit={handleClose} onOpenChange={(v) => { if (!v) setCloseOpen(false) }}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Closing balance (RM)</label>
            <Input type="number" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} />
          </div>
          <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Notes" value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} />
          <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <p className="font-medium">Summary</p>
            <p>Total sales: RM {Number(summary.totalSales ?? 0).toFixed(2)}</p>
            <p>Total orders: {summary.totalOrders ?? 0}</p>
            <p>Cash: RM {Number(summary.cashSales ?? 0).toFixed(2)}</p>
            <p>QR: RM {Number(summary.qrSales ?? 0).toFixed(2)}</p>
            <p>Card: RM {Number(summary.cardSales ?? 0).toFixed(2)}</p>
            <p>Discounts: RM {Number(summary.totalDiscounts ?? 0).toFixed(2)}</p>
            <p>Refunds: RM {Number(summary.totalRefunds ?? 0).toFixed(2)}</p>
          </div>
        </div>
      </FormModal>
    </div>
  )
}
