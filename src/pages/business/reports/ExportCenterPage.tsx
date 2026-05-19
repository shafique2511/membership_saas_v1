import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTabs } from './ReportTabs'
import {
  exportToCsv,
  exportToExcel,
  exportToPdf,
  getBookingReport,
  getBranchReport,
  getCustomerReport,
  getDashboardSummary,
  getInventoryReport,
  getLoyaltyReport,
  getMarketingReport,
  getMembershipReport,
  getNoShowReport,
  getPaymentReport,
  getProfitReport,
  getSalesReport,
  getStaffReport,
  type BookingReport,
  type BranchReport,
  type CustomerReport,
  type DashboardSummary,
  type InventoryReport,
  type LoyaltyReport,
  type MarketingReport,
  type MembershipReport,
  type NoShowReport,
  type PaymentReport,
  type ProfitReport,
  type SalesReport,
  type StaffReport,
} from '@/services/reports'
import { formatCurrency } from '@/utils/format'

interface ExportData {
  summary: DashboardSummary | null
  sales: SalesReport | null
  bookings: BookingReport | null
  memberships: MembershipReport | null
  customers: CustomerReport | null
  loyalty: LoyaltyReport | null
  staff: StaffReport | null
  inventory: InventoryReport | null
  payments: PaymentReport | null
  profit: ProfitReport | null
  noShows: NoShowReport | null
  branches: BranchReport | null
  marketing: MarketingReport | null
}

interface ExportItem {
  name: string
  description: string
  headers: string[]
  rows: () => string[][]
}

const emptyExportData: ExportData = {
  summary: null,
  sales: null,
  bookings: null,
  memberships: null,
  customers: null,
  loyalty: null,
  staff: null,
  inventory: null,
  payments: null,
  profit: null,
  noShows: null,
  branches: null,
  marketing: null,
}

export function ExportCenterPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [data, setData] = useState<ExportData>(emptyExportData)

  const load = useCallback(async () => {
    if (!businessId) return
    const [
      summary,
      sales,
      bookings,
      memberships,
      customers,
      loyalty,
      staff,
      inventory,
      payments,
      profit,
      noShows,
      branches,
      marketing,
    ] = await Promise.all([
      getDashboardSummary(businessId),
      getSalesReport(businessId),
      getBookingReport(businessId),
      getMembershipReport(businessId),
      getCustomerReport(businessId),
      getLoyaltyReport(businessId),
      getStaffReport(businessId),
      getInventoryReport(businessId),
      getPaymentReport(businessId),
      getProfitReport(businessId),
      getNoShowReport(businessId),
      getBranchReport(businessId),
      getMarketingReport(businessId),
    ])
    setData({ summary, sales, bookings, memberships, customers, loyalty, staff, inventory, payments, profit, noShows, branches, marketing })
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const exports: ExportItem[] = [
    {
      name: 'Sales Report',
      description: 'Daily revenue and order count',
      headers: ['Date', 'Revenue', 'Orders'],
      rows: () => (data.sales?.daily ?? []).map((item) => [item.date, String(item.revenue), String(item.orders)]),
    },
    {
      name: 'Booking Report',
      description: 'Booking status breakdown',
      headers: ['Status', 'Count'],
      rows: () => (data.bookings?.by_status ?? []).map((item) => [item.status, String(item.count)]),
    },
    {
      name: 'Membership Report',
      description: 'Membership count by plan',
      headers: ['Plan', 'Members'],
      rows: () => (data.memberships?.by_plan ?? []).map((item) => [item.plan_name, String(item.count)]),
    },
    {
      name: 'Customer Report',
      description: 'Top customers by spend',
      headers: ['Customer', 'Total Spent', 'Visits'],
      rows: () => (data.customers?.top_customers ?? []).map((item) => [item.name, String(item.total_spent), String(item.visit_count)]),
    },
    {
      name: 'Loyalty Report',
      description: 'Points movement by transaction type',
      headers: ['Type', 'Points', 'Count'],
      rows: () => (data.loyalty?.by_type ?? []).map((item) => [item.type, String(item.points), String(item.count)]),
    },
    {
      name: 'Staff Report',
      description: 'Staff booking performance',
      headers: ['Staff', 'Bookings'],
      rows: () => (data.staff?.top_by_bookings ?? []).map((item) => [item.name, String(item.booking_count)]),
    },
    {
      name: 'Inventory Report',
      description: 'Stock value by category',
      headers: ['Category', 'Products', 'Value'],
      rows: () => (data.inventory?.by_category ?? []).map((item) => [item.category, String(item.count), String(item.value)]),
    },
    {
      name: 'Payment Report',
      description: 'Payment collection by method',
      headers: ['Method', 'Total', 'Count'],
      rows: () => (data.payments?.by_method ?? []).map((item) => [item.method, String(item.total), String(item.count)]),
    },
    {
      name: 'Profit Report',
      description: 'Revenue, refunds, COGS, and margin',
      headers: ['Metric', 'Value'],
      rows: () => {
        const report = data.profit
        if (!report) return []
        return [
          ['Revenue', formatCurrency(report.total_revenue)],
          ['Refunds', formatCurrency(report.total_refunds)],
          ['Estimated COGS', formatCurrency(report.estimated_cogs)],
          ['Gross Profit', formatCurrency(report.gross_profit)],
          ['Margin', `${report.profit_margin.toFixed(1)}%`],
        ]
      },
    },
    {
      name: 'No-show Report',
      description: 'Recent no-show bookings',
      headers: ['Date', 'Customer', 'Staff'],
      rows: () => (data.noShows?.recent ?? []).map((item) => [item.date, item.customer, item.staff]),
    },
    {
      name: 'Branch Report',
      description: 'Branch comparison',
      headers: ['Branch', 'Bookings', 'Orders', 'Revenue'],
      rows: () => (data.branches?.by_branch ?? []).map((item) => [item.branch_name, String(item.bookings), String(item.orders), String(item.revenue)]),
    },
    {
      name: 'Marketing Report',
      description: 'Campaign performance',
      headers: ['Campaign', 'Reached', 'Converted', 'Revenue'],
      rows: () => (data.marketing?.by_campaign ?? []).map((item) => [item.name, String(item.reached), String(item.converted), String(item.revenue)]),
    },
    {
      name: 'Dashboard Summary',
      description: 'Key metrics snapshot',
      headers: ['Metric', 'Value'],
      rows: () => {
        const summary = data.summary
        if (!summary) return []
        return [
          ['Revenue Today', formatCurrency(summary.revenue_today)],
          ['Revenue This Month', formatCurrency(summary.revenue_month)],
          ['Bookings Today', String(summary.bookings_today)],
          ['Bookings This Month', String(summary.bookings_month)],
          ['Active Members', String(summary.active_members)],
          ['Low Stock Items', String(summary.low_stock)],
          ['Pending Verifications', String(summary.pending_verifications)],
          ['No-show Rate', `${summary.no_show_rate.toFixed(1)}%`],
        ]
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Export Center</h2>
        <p className="text-sm text-slate-500">Download reports as CSV, Excel, or print-ready PDF.</p>
      </div>
      <ReportTabs />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exports.map((item) => (
          <Card key={item.name}>
            <CardHeader><CardTitle>{item.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <div className="flex gap-2">
                <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={() => exportToCsv(item.name.toLowerCase().replace(/\s+/g, '-'), item.headers, item.rows())}>CSV</button>
                <button className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted" onClick={() => void exportToExcel(item.name.toLowerCase().replace(/\s+/g, '-'), item.headers, item.rows())}>Excel</button>
                <button className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted" onClick={() => exportToPdf(item.name.toLowerCase().replace(/\s+/g, '-'), item.headers, item.rows())}>PDF</button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
