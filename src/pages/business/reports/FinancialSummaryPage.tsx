import { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, DollarSign, Package, Percent, QrCode, ReceiptText, RotateCcw, Scissors, TrendingUp, WalletCards } from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { StatCard } from '@/components/ui/StatCard'
import { ReportTabs } from './ReportTabs'
import { getFinancialSummaryReport, type FinancialLineItem, type FinancialPeriodSummary, type FinancialSummaryReport, type ReportFilter } from '@/services/reports'
import { formatCurrency } from '@/utils/format'

type PeriodView = 'daily' | 'weekly' | 'monthly'

function money(value: number | undefined): string {
  return formatCurrency(value ?? 0)
}

function SummaryBars({ rows }: { rows: FinancialPeriodSummary[] }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.gross_sales, row.net_sales, row.estimated_profit)))

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No financial activity for this period.</p>
  }

  return (
    <div className="space-y-3">
      {rows.slice(-12).map((row) => (
        <div key={row.period} className="grid gap-2 text-sm sm:grid-cols-[120px_1fr_110px] sm:items-center">
          <span className="font-medium">{row.period}</span>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(3, (row.net_sales / max) * 100)}%` }} />
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.max(3, (row.estimated_profit / max) * 100)}%` }} />
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Net {money(row.net_sales)}</p>
            <p>Profit {money(row.estimated_profit)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function LineItemTable({ rows, mode }: { rows: FinancialLineItem[]; mode: 'product' | 'service' | 'membership' }) {
  return (
    <DataTable
      columns={[
        { key: 'name', header: mode === 'product' ? 'Product' : mode === 'service' ? 'Service' : 'Membership' },
        { key: 'quantity', header: 'Qty', render: (row) => Number(row.quantity ?? 0).toLocaleString() },
        { key: 'revenue', header: 'Revenue', render: (row) => money(Number(row.revenue ?? 0)) },
        ...(mode === 'product'
          ? [
              { key: 'cost', header: 'Cost', render: (row: Record<string, unknown>) => money(Number(row.cost ?? 0)) },
              { key: 'profit', header: 'Profit', render: (row: Record<string, unknown>) => money(Number(row.profit ?? 0)) },
            ]
          : mode === 'service'
            ? [
                { key: 'commission', header: 'Commission', render: (row: Record<string, unknown>) => money(Number(row.commission ?? 0)) },
                { key: 'profit', header: 'Est. profit', render: (row: Record<string, unknown>) => money(Number(row.profit ?? 0)) },
              ]
            : []),
      ]}
      data={rows as unknown as Record<string, unknown>[]}
      emptyMessage="No data found."
    />
  )
}

export function FinancialSummaryPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [report, setReport] = useState<FinancialSummaryReport | null>(null)
  const [filter, setFilter] = useState<ReportFilter>({ days: 30 })
  const [periodView, setPeriodView] = useState<PeriodView>('daily')

  const load = useCallback(async () => {
    if (!businessId) return
    setReport(await getFinancialSummaryReport(businessId, filter))
  }, [businessId, filter])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const periodRows = useMemo(() => {
    if (!report) return []
    if (periodView === 'weekly') return report.weekly
    if (periodView === 'monthly') return report.monthly
    return report.daily
  }, [periodView, report])

  const paymentMax = Math.max(1, ...(report?.payment_methods ?? []).map((method) => method.total))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Financial Summary</h2>
          <p className="text-sm text-slate-500">Gross sales, payment mix, item revenue, and estimated profit.</p>
        </div>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={filter.days}
          onChange={(event) => setFilter({ days: Number(event.target.value) })}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      <ReportTabs />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={money(report?.gross_sales)} hint="Before POS discounts and refunds" icon={ReceiptText} />
        <StatCard label="Discounts" value={money(report?.discounts)} hint="POS order discounts" icon={Percent} />
        <StatCard label="Refunds" value={money(report?.refunds)} hint="Approved and completed refunds" icon={RotateCcw} />
        <StatCard label="Net sales" value={money(report?.net_sales)} hint="Gross less discounts and refunds" icon={TrendingUp} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cash sales" value={money(report?.cash_sales)} hint="Paid cash payments" icon={Banknote} />
        <StatCard label="QR sales" value={money(report?.qr_sales)} hint="Paid QR payments" icon={QrCode} />
        <StatCard label="Card sales" value={money(report?.card_sales)} hint="Paid card payments" icon={CreditCard} />
        <StatCard label="Estimated profit" value={money(report?.estimated_profit)} hint="Product margin plus service revenue after commission" icon={DollarSign} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Product sales" value={money(report?.product_sales)} hint="Completed POS product items" icon={Package} />
        <StatCard label="Service sales" value={money(report?.service_sales)} hint="POS service items and completed bookings" icon={Scissors} />
        <StatCard label="Membership sales" value={money(report?.membership_sales)} hint="Completed POS membership items" icon={WalletCards} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Summary by period</CardTitle>
            <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              {(['daily', 'weekly', 'monthly'] as PeriodView[]).map((view) => (
                <button
                  key={view}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${periodView === view ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  onClick={() => setPeriodView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <SummaryBars rows={periodRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment method breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.payment_methods.length ? (
              <div className="space-y-3">
                {report.payment_methods.map((method) => (
                  <div key={method.method}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize">{method.method.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500">{money(method.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(4, (method.total / paymentMax) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No paid payments for this period.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Product profit</CardTitle></CardHeader>
          <CardContent className="p-0">
            <LineItemTable rows={report?.product_profit ?? []} mode="product" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Service revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <LineItemTable rows={report?.service_revenue ?? []} mode="service" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Membership revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            <LineItemTable rows={report?.membership_revenue ?? []} mode="membership" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
