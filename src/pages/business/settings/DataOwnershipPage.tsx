import { useCallback, useEffect, useState } from 'react'
import { Database, Download, FileArchive, ShieldCheck } from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SettingsTabs } from './SettingsTabs'
import {
  businessExportOptions,
  downloadBusinessExport,
  listDataExportRequests,
  type BusinessExportFormat,
  type BusinessExportScope,
  type DataExportRequest,
} from '@/services/dataGovernance'

const policyItems = [
  {
    title: 'Business data ownership',
    text: 'Each business owner owns their customers, bookings, memberships, payments, loyalty records, inventory, POS history, and operational exports.',
  },
  {
    title: 'Platform ownership',
    text: 'The platform owner owns the software, system infrastructure, brand, global package configuration, and platform operations.',
  },
  {
    title: 'Processing role',
    text: 'The platform stores, processes, and manages business data only to operate the service, provide support, comply with law, migrate hosting, or recover from disaster.',
  },
  {
    title: 'Export and migration',
    text: 'Business owners can export their own tenant data. Migration support should include data export, schema notes, and reasonable transfer assistance.',
  },
]

export function DataOwnershipPage() {
  const { hasPermission, profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [exports, setExports] = useState<DataExportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [exportingScope, setExportingScope] = useState<BusinessExportScope | null>(null)
  const [format, setFormat] = useState<BusinessExportFormat>('zip')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      setExports(await listDataExportRequests(businessId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function canExport(scope: BusinessExportScope) {
    if (profile?.role === 'owner' || profile?.role === 'super_admin') return true
    if (profile?.role !== 'manager') return false
    const option = businessExportOptions.find((item) => item.scope === scope)
    return option ? hasPermission(option.permission) : false
  }

  async function handleExport(scope: BusinessExportScope) {
    if (!businessId || !canExport(scope)) return
    setExportingScope(scope)
    setError('')
    try {
      await downloadBusinessExport({ businessId, scope, format })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExportingScope(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data ownership & backup</h2>
          <p className="text-sm text-slate-500">Export your business data and review ownership, backup, migration, and shutdown rights.</p>
        </div>
        <div className="w-full sm:w-56">
          <Field label="Export format">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={format}
              onChange={(event) => setFormat(event.target.value as BusinessExportFormat)}
            >
              <option value="zip">ZIP</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="json">JSON</option>
            </select>
          </Field>
        </div>
      </div>

      <SettingsTabs />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {policyItems.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Business owner backup
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {businessExportOptions.map((option) => (
            <Button
              key={option.scope}
              variant={option.scope === 'business_full' ? 'default' : 'outline'}
              className="justify-start"
              onClick={() => void handleExport(option.scope)}
              disabled={Boolean(exportingScope) || !canExport(option.scope)}
            >
              <Download className="h-4 w-4" />
              {exportingScope === option.scope ? 'Preparing...' : option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileArchive className="h-4 w-4" />
            Export history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState label="Loading export history" />
          ) : exports.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No exports yet"
              description="Business owner exports will be logged here for audit and migration tracking."
            />
          ) : (
            <DataTable
              columns={[
                { key: 'requested_at', header: 'Requested' },
                { key: 'export_scope', header: 'Scope' },
                { key: 'export_format', header: 'Format' },
                { key: 'status', header: 'Status' },
                { key: 'file_name', header: 'File' },
              ]}
              data={exports as unknown as Record<string, unknown>[]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Shutdown policy</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Before a planned shutdown, the platform owner should notify businesses, freeze destructive changes, create a full platform backup, and provide each business a reasonable export window.</p>
          <p>Business exports contain tenant-owned records. Platform backups are controlled by the platform owner for disaster recovery, legal compliance, migration, and shutdown continuity.</p>
        </CardContent>
      </Card>
    </div>
  )
}
