import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { listPlatformRows } from '@/services/admin'

type PlatformTable = 'business_addons' | 'billing_invoices' | 'payments' | 'usage_counters' | 'audit_logs'

interface PlatformTablePageProps {
  table: PlatformTable
  title: string
  description: string
}

export function PlatformTablePage({ table, title, description }: PlatformTablePageProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    void listPlatformRows(table).then((data) => setRows(data as Record<string, unknown>[])).catch(() => setRows([]))
  }, [table])

  const columns =
    table === 'audit_logs'
      ? [
          { key: 'action', header: 'Action' },
          { key: 'table_name', header: 'Table' },
          { key: 'record_id', header: 'Record' },
          { key: 'created_at', header: 'Created' },
        ]
      : table === 'usage_counters'
        ? [
            { key: 'module_key', header: 'Module', render: (row: Record<string, unknown>) => <Badge>{String(row.module_key)}</Badge> },
            { key: 'usage_key', header: 'Usage' },
            { key: 'used_count', header: 'Used' },
            { key: 'limit_count', header: 'Limit', render: (row: Record<string, unknown>) => String(row.limit_count ?? 'Unlimited') },
          ]
        : table === 'payments'
          ? [
              { key: 'reference_type', header: 'Reference' },
              { key: 'payment_method', header: 'Method' },
              { key: 'amount', header: 'Amount', render: (row: Record<string, unknown>) => `RM ${Number(row.amount ?? 0).toLocaleString()}` },
              { key: 'status', header: 'Status', render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
            ]
          : table === 'billing_invoices'
            ? [
                { key: 'invoice_number', header: 'Invoice' },
                { key: 'amount', header: 'Amount', render: (row: Record<string, unknown>) => `RM ${Number(row.amount ?? 0).toLocaleString()}` },
                { key: 'due_date', header: 'Due' },
                { key: 'status', header: 'Status', render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status)} /> },
              ]
            : [
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
