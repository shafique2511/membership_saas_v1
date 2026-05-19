import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAppContext } from '@/context/useAppContext'
import {
  csvImportTemplates,
  downloadCsvTemplate,
  importCsvPreview,
  listCsvImportHistory,
  parseCsvFile,
  previewCsvImport,
  type CsvImportHistoryRow,
  type CsvImportPreview,
  type CsvImportType,
} from '@/services/csvImport'
import { SettingsTabs } from './SettingsTabs'

export function CsvImportPage() {
  const { profile, hasPermission } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [importType, setImportType] = useState<CsvImportType>('customers')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [history, setHistory] = useState<CsvImportHistoryRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const template = useMemo(
    () => csvImportTemplates.find((item) => item.type === importType) ?? csvImportTemplates[0],
    [importType],
  )

  const canImport = profile?.role === 'owner' || profile?.role === 'super_admin' || hasPermission('data.import')

  const loadHistory = useCallback(async () => {
    if (!businessId) return
    setLoadingHistory(true)
    try {
      setHistory(await listCsvImportHistory(businessId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingHistory(false)
    }
  }, [businessId])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0)
    return () => window.clearTimeout(timer)
  }, [loadHistory])

  async function handlePreview() {
    if (!file || !businessId) return
    setBusy(true)
    setError('')
    try {
      const rows = await parseCsvFile(file)
      setPreview(await previewCsvImport(businessId, importType, rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmImport() {
    if (!preview || !file || !businessId || !canImport) return
    setBusy(true)
    setError('')
    try {
      await importCsvPreview(businessId, file.name, preview)
      setPreview(null)
      setFile(null)
      await loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">CSV import</h2>
        <p className="text-sm text-slate-500">Import existing customers, products, services, memberships, and inventory into this business.</p>
      </div>

      <SettingsTabs />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {!canImport && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>Only business owners, super admins, or managers granted data import permission can confirm imports.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Import CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <Field label="Import type" description={template.description}>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={importType}
                onChange={(event) => {
                  setImportType(event.target.value as CsvImportType)
                  setPreview(null)
                  setFile(null)
                }}
              >
                {csvImportTemplates.map((item) => (
                  <option key={item.type} value={item.type}>{item.label}</option>
                ))}
              </select>
            </Field>

            <Field label="CSV file" description="Upload a CSV file using the template headers.">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  setPreview(null)
                }}
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => downloadCsvTemplate(importType)}>
                <Download className="h-4 w-4" />
                Download CSV template
              </Button>
              <Button onClick={() => void handlePreview()} disabled={!file || busy}>
                <FileSpreadsheet className="h-4 w-4" />
                {busy ? 'Checking...' : 'Preview import data'}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
            <p className="font-medium">Required fields</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.requiredFields.map((field) => <Badge key={field} variant="warning">{field}</Badge>)}
            </div>
            <p className="mt-4 font-medium">Template headers</p>
            <p className="mt-2 break-words text-slate-600 dark:text-slate-300">{template.headers.join(', ')}</p>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview and validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-5">
              {[
                ['Rows', preview.totalRows],
                ['Valid', preview.validRows],
                ['Errors', preview.errorRows],
                ['New', preview.insertRows],
                ['Updates', preview.updateRows],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-semibold">{String(value)}</p>
                </div>
              ))}
            </div>

            <DataTable
              columns={[
                { key: 'rowNumber', header: 'CSV row' },
                {
                  key: 'action',
                  header: 'Action',
                  render: (row) => (
                    <Badge variant={row.action === 'error' ? 'danger' : row.action === 'update' ? 'warning' : 'success'}>
                      {String(row.action)}
                    </Badge>
                  ),
                },
                { key: 'errors', header: 'Errors', render: (row) => (row.errors as string[]).join('; ') || '-' },
                { key: 'data', header: 'Data', render: (row) => JSON.stringify(row.data) },
              ]}
              data={preview.rows as unknown as Record<string, unknown>[]}
            />

            <div className="flex justify-end">
              <Button onClick={() => void handleConfirmImport()} disabled={busy || preview.errorRows > 0 || !canImport}>
                {busy ? 'Importing...' : 'Confirm import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Import history</CardTitle></CardHeader>
        <CardContent>
          {loadingHistory ? (
            <LoadingState label="Loading import history" />
          ) : history.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No imports yet" description="CSV import batches will be logged here for audit and rollback review." />
          ) : (
            <DataTable
              columns={[
                { key: 'created_at', header: 'Imported', render: (row) => new Date(String(row.created_at)).toLocaleString() },
                { key: 'import_type', header: 'Type' },
                { key: 'file_name', header: 'File', render: (row) => String(row.file_name ?? '-') },
                { key: 'status', header: 'Status' },
                { key: 'total_rows', header: 'Rows' },
                { key: 'inserted_rows', header: 'Inserted' },
                { key: 'updated_rows', header: 'Updated' },
                { key: 'error_rows', header: 'Errors' },
              ]}
              data={history as unknown as Record<string, unknown>[]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
