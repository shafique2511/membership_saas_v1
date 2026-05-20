import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAppContext } from '@/context/useAppContext'
import { formatAuditAction, getAuditFilterOptions, getBusinessAuditLogs, type AuditLog } from '@/services/auditLogs'

function getActor(row: AuditLog) {
  const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles
  return profile?.full_name ?? profile?.email ?? row.user_id ?? 'System'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function summarizeData(row: AuditLog) {
  const data = row.new_data ?? row.old_data
  if (!data) return 'No payload'

  const importantKeys = ['full_name', 'name', 'status', 'amount', 'payment_method', 'booking_date', 'start_time', 'end_time']
  const parts = importantKeys
    .filter((key) => data[key] !== undefined && data[key] !== null)
    .map((key) => `${key.replaceAll('_', ' ')}: ${String(data[key])}`)

  return parts.length ? parts.join(' | ') : `Record ${row.record_id ?? ''}`.trim()
}

export function AuditLogsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [rows, setRows] = useState<AuditLog[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [tables, setTables] = useState<string[]>([])
  const [action, setAction] = useState('')
  const [tableName, setTableName] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const [nextRows, options] = await Promise.all([
      getBusinessAuditLogs(businessId, { action: action || undefined, tableName: tableName || undefined }),
      getAuditFilterOptions(businessId),
    ])
    setRows(nextRows)
    setActions(options.actions)
    setTables(options.tables)
  }, [action, businessId, tableName])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  const stats = useMemo(() => {
    return {
      total: rows.length,
      destructive: rows.filter((row) => row.action.includes('deleted') || row.action.includes('cancelled') || row.action.includes('refunded')).length,
      settings: rows.filter((row) => row.action.includes('changed')).length,
    }
  }, [rows])

  if (profile?.role !== 'owner' && profile?.role !== 'super_admin') {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Audit logs are restricted"
        description="Only the business owner can view this business audit trail."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Track important booking, customer, payment, POS, package, permission, backup, membership, and settings actions for this business."
        actions={<Button variant="outline" onClick={() => void load()}>Refresh</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Visible logs</p>
            <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Cancelled, deleted, refunded</p>
            <p className="mt-2 text-3xl font-semibold">{stats.destructive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Settings and access changes</p>
            <p className="mt-2 text-3xl font-semibold">{stats.settings}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">All actions</option>
            {actions.map((item) => <option key={item} value={item}>{formatAuditAction(item)}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={tableName} onChange={(event) => setTableName(event.target.value)}>
            <option value="">All tables</option>
            {tables.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button variant="outline" onClick={() => { setAction(''); setTableName('') }}>Clear filters</Button>
        </CardContent>
      </Card>

      {rows.length ? (
        <DataTable
          columns={[
            { key: 'created_at', header: 'Time', render: (row) => formatDate(String(row.created_at)) },
            { key: 'action', header: 'Action', render: (row) => <Badge>{formatAuditAction(String(row.action))}</Badge> },
            { key: 'table_name', header: 'Table' },
            { key: 'user_id', header: 'Actor', render: (row) => getActor(row as unknown as AuditLog) },
            { key: 'record_id', header: 'Summary', render: (row) => <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{summarizeData(row as unknown as AuditLog)}</span> },
            { key: 'id', header: '', render: (row) => <Button size="sm" variant="outline" onClick={() => setSelected(row as unknown as AuditLog)}>Details</Button> },
          ]}
          data={rows as unknown as Record<string, unknown>[]}
        />
      ) : (
        <EmptyState icon={History} title="No audit logs yet" description="Important actions will appear here after users create, edit, cancel, delete, refund, export, download, or change access settings." />
      )}

      {selected ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>{formatAuditAction(selected.action)}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Context</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p>Table: {selected.table_name}</p>
                <p>Record: {selected.record_id ?? '-'}</p>
                <p>Actor: {getActor(selected)}</p>
                <p>IP: {selected.ip_address ?? '-'}</p>
                <p>User agent: {selected.user_agent ?? '-'}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(selected.old_data, null, 2)}</pre>
              <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(selected.new_data, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
