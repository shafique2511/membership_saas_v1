import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listAddons, listInvoices, listPayments, listUsageCounters, listAuditLogs } from '@/services/admin'

type PlatformTable = 'business_addons' | 'billing_invoices' | 'payments' | 'usage_counters' | 'audit_logs'

interface PlatformTablePageProps {
  table: PlatformTable
  title: string
  description: string
  showBusinessName?: boolean
}

export function PlatformTablePage({ table, title, description, showBusinessName = false }: PlatformTablePageProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    const load = async () => {
      let data: Record<string, unknown>[]
      try {
        switch (table) {
          case 'billing_invoices': data = (await listInvoices()) as Record<string, unknown>[]; break
          case 'payments': data = (await listPayments()) as Record<string, unknown>[]; break
          case 'usage_counters': data = (await listUsageCounters()) as Record<string, unknown>[]; break
          case 'audit_logs': data = (await listAuditLogs()) as Record<string, unknown>[]; break
          default: data = (await listAddons()) as Record<string, unknown>[]; break
        }
        setRows(data)
      } catch {
        setRows([])
      }
    }
    void load()
  }, [table])

  function renderBusinessName(row: Record<string, unknown>) {
    const business = row.businesses as { name?: string } | null
    return business?.name ?? String(row.business_id ?? '-')
  }

  const businessColumn = showBusinessName
    ? [{ key: 'businesses', header: 'Business', render: (row: Record<string, unknown>) => renderBusinessName(row) }]
    : []

  const columns =
    table === 'audit_logs'
      ? [
          ...businessColumn,
          { key: 'action', header: 'Action' },
          { key: 'table_name', header: 'Table' },
          { key: 'record_id', header: 'Record' },
          { key: 'created_at', header: 'Created' },
        ]
      : table === 'usage_counters'
        ? [
            ...businessColumn,
            { key: 'module_key', header: 'Module', render: (row: Record<string, unknown>) => <Badge>{String(row.module_key)}</Badge> },
            { key: 'usage_key', header: 'Usage' },
            { key: 'used_count', header: 'Used' },
            { key: 'limit_count', header: 'Limit', render: (row: Record<string, unknown>) => String(row.limit_count ?? 'Unlimited') },
          ]
        : table === 'payments'
          ? [
              ...businessColumn,
              { key: 'reference_type', header: 'Reference' },
              { key: 'payment_method', header: 'Method' },
              { key: 'amount', header: 'Amount', render: (row: Record<string, unknown>) => `RM ${Number(row.amount ?? 0).toLocaleString()}` },
              { key: 'status', header: 'Status', render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
            ]
          : table === 'billing_invoices'
            ? [
                ...businessColumn,
                { key: 'invoice_number', header: 'Invoice' },
                { key: 'amount', header: 'Amount', render: (row: Record<string, unknown>) => `RM ${Number(row.amount ?? 0).toLocaleString()}` },
                { key: 'due_date', header: 'Due' },
                { key: 'status', header: 'Status', render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
              ]
            : [
                ...businessColumn,
                { key: 'name', header: 'Add-on' },
                { key: 'module_key', header: 'Module', render: (row: Record<string, unknown>) => <Badge>{String(row.module_key)}</Badge> },
                { key: 'price', header: 'Price', render: (row: Record<string, unknown>) => `RM ${Number(row.price ?? 0).toLocaleString()}` },
                { key: 'status', header: 'Status', render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
              ]

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <DataTable columns={columns} data={rows} />
    </div>
  )
}
