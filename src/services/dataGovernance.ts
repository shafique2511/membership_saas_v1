import { supabase } from '@/lib/supabase'
import ExcelJS from 'exceljs'
import {
  downloadBlob,
  downloadZip,
  exportRowsToCsv,
  exportRowsToXlsx,
  normalizeRow,
  rowsToCsv,
  type ZipFile,
} from '@/utils/export'

export const businessExportTables = [
  'businesses',
  'branches',
  'customers',
  'staff',
  'services',
  'bookable_resources',
  'bookings',
  'membership_plans',
  'memberships',
  'membership_usage',
  'loyalty_transactions',
  'rewards',
  'products',
  'inventory_transactions',
  'pos_orders',
  'pos_order_items',
  'payments',
  'invoices',
  'receipts',
  'refunds',
  'notifications',
  'notification_templates',
  'marketing_campaigns',
  'promo_codes',
  'customer_segments',
  'business_subscriptions',
  'business_module_access',
  'business_addons',
  'usage_counters',
  'staff_permissions',
  'staff_user_permissions',
  'daily_closings',
  'pos_discounts',
  'pos_membership_usage',
  'pos_points_redemption',
  'pos_receipts',
  'suppliers',
  'staff_services',
  'commission_rules',
  'commission_records',
  'payment_settings',
  'channel_settings',
  'notification_schedules',
  'notification_broadcasts',
  'campaign_results',
  'branch_staff',
] as const

export type BusinessExportTable = typeof businessExportTables[number]
export type BusinessExportFormat = 'csv' | 'excel' | 'json' | 'zip'
export type BusinessExportScope =
  | 'business_full'
  | 'customers'
  | 'bookings'
  | 'memberships'
  | 'loyalty_points'
  | 'pos_orders'
  | 'inventory'
  | 'staff'
  | 'products_services'
  | 'payments'
  | 'reports'
  | 'uploaded_files'

export interface BusinessExportOption {
  scope: BusinessExportScope
  label: string
  permission: 'data.export' | 'data.backup.manage'
}

export const businessExportOptions: BusinessExportOption[] = [
  { scope: 'business_full', label: 'Export Full Business Backup', permission: 'data.backup.manage' },
  { scope: 'customers', label: 'Export Customers', permission: 'data.export' },
  { scope: 'bookings', label: 'Export Bookings', permission: 'data.export' },
  { scope: 'memberships', label: 'Export Memberships', permission: 'data.export' },
  { scope: 'loyalty_points', label: 'Export Loyalty Points', permission: 'data.export' },
  { scope: 'pos_orders', label: 'Export POS Orders', permission: 'data.export' },
  { scope: 'inventory', label: 'Export Inventory', permission: 'data.export' },
  { scope: 'staff', label: 'Export Staff', permission: 'data.export' },
  { scope: 'products_services', label: 'Export Products & Services', permission: 'data.export' },
  { scope: 'payments', label: 'Export Payments', permission: 'data.export' },
  { scope: 'reports', label: 'Export Reports', permission: 'data.export' },
  { scope: 'uploaded_files', label: 'Export Uploaded Files', permission: 'data.export' },
]

const scopeTables: Record<Exclude<BusinessExportScope, 'business_full' | 'reports' | 'uploaded_files'>, BusinessExportTable[]> = {
  customers: ['customers'],
  bookings: ['bookings'],
  memberships: ['membership_plans', 'memberships', 'membership_usage'],
  loyalty_points: ['loyalty_transactions', 'rewards'],
  pos_orders: ['pos_orders', 'pos_order_items'],
  inventory: ['products', 'inventory_transactions', 'suppliers'],
  staff: ['staff', 'staff_services', 'staff_permissions', 'staff_user_permissions', 'branch_staff'],
  products_services: ['products', 'services'],
  payments: ['payments', 'invoices', 'receipts', 'refunds', 'payment_settings'],
}

const fullBackupFiles: { table: BusinessExportTable; path: string }[] = [
  { table: 'customers', path: 'customers.csv' },
  { table: 'bookings', path: 'bookings.csv' },
  { table: 'memberships', path: 'memberships.csv' },
  { table: 'membership_usage', path: 'membership_usage.csv' },
  { table: 'loyalty_transactions', path: 'loyalty_transactions.csv' },
  { table: 'rewards', path: 'rewards.csv' },
  { table: 'staff', path: 'staff.csv' },
  { table: 'services', path: 'services.csv' },
  { table: 'products', path: 'products.csv' },
  { table: 'inventory_transactions', path: 'inventory_transactions.csv' },
  { table: 'pos_orders', path: 'pos_orders.csv' },
  { table: 'pos_order_items', path: 'pos_order_items.csv' },
  { table: 'payments', path: 'payments.csv' },
  { table: 'branches', path: 'branches.csv' },
]

export interface DataExportRequest {
  id: string
  business_id: string
  requested_by: string | null
  export_scope: string
  export_format: string
  status: string
  file_name: string | null
  row_counts: Record<string, number>
  notes: string | null
  requested_at: string
  completed_at: string | null
  expires_at: string | null
}

export interface PlatformBackupLog {
  id: string
  initiated_by: string | null
  backup_type: string
  backup_scope: string
  status: string
  storage_location: string | null
  checksum: string | null
  notes: string | null
  started_at: string
  completed_at: string | null
  retention_until: string | null
  created_at: string
}

export interface BusinessDataExport {
  generated_at: string
  business_id: string
  ownership_policy: {
    business_owner_owns: string
    platform_owner_owns: string
    platform_role: string
  }
  tables: Partial<Record<BusinessExportTable, unknown[]>>
  row_counts: Record<string, number>
}

function tableRows(payload: BusinessDataExport, table: BusinessExportTable): Record<string, unknown>[] {
  return ((payload.tables[table] ?? []) as Record<string, unknown>[]).map((row) => ({ ...row }))
}

function rowsForScope(payload: BusinessDataExport, scope: BusinessExportScope): Record<string, unknown>[] {
  if (scope === 'business_full') {
    return Object.entries(payload.tables).flatMap(([table, rows]) =>
      ((rows ?? []) as Record<string, unknown>[]).map((row) => ({ export_table: table, ...row })),
    )
  }

  if (scope === 'reports') {
    return [{
      generated_at: payload.generated_at,
      business_id: payload.business_id,
      row_counts: JSON.stringify(payload.row_counts),
      total_rows: Object.values(payload.row_counts).reduce((sum, count) => sum + count, 0),
    }]
  }

  if (scope === 'uploaded_files') {
    return [{
      generated_at: payload.generated_at,
      business_id: payload.business_id,
      note: 'Uploaded files require server-side storage backup or signed URL generation. This export records the requested file backup scope.',
    }]
  }

  return scopeTables[scope].flatMap((table) => tableRows(payload, table).map((row) => ({ export_table: table, ...row })))
}

export async function exportBusinessData(businessId: string): Promise<BusinessDataExport> {
  const tables: BusinessDataExport['tables'] = {}
  const rowCounts: Record<string, number> = {}
  const directBusinessTables = businessExportTables.filter((table) => ![
    'businesses',
    'pos_order_items',
    'pos_discounts',
    'pos_membership_usage',
    'pos_points_redemption',
    'branch_staff',
  ].includes(table))

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)

  tables.businesses = business ?? []
  rowCounts.businesses = business?.length ?? 0

  for (const table of directBusinessTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('business_id', businessId)

    if (error) {
      tables[table] = []
      rowCounts[table] = 0
      continue
    }

    tables[table] = data ?? []
    rowCounts[table] = data?.length ?? 0
  }

  const posOrders = (tables.pos_orders ?? []) as { id: string }[]
  const posOrderIds = posOrders.map((order) => order.id)
  for (const table of ['pos_order_items', 'pos_discounts', 'pos_membership_usage', 'pos_points_redemption'] as const) {
    if (posOrderIds.length === 0) {
      tables[table] = []
      rowCounts[table] = 0
      continue
    }

    const { data } = await supabase.from(table).select('*').in('order_id', posOrderIds)
    tables[table] = data ?? []
    rowCounts[table] = data?.length ?? 0
  }

  const branches = (tables.branches ?? []) as { id: string }[]
  const branchIds = branches.map((branch) => branch.id)
  if (branchIds.length > 0) {
    const { data } = await supabase.from('branch_staff').select('*').in('branch_id', branchIds)
    tables.branch_staff = data ?? []
    rowCounts.branch_staff = data?.length ?? 0
  } else {
    tables.branch_staff = []
    rowCounts.branch_staff = 0
  }

  return {
    generated_at: new Date().toISOString(),
    business_id: businessId,
    ownership_policy: {
      business_owner_owns: 'Business records, customer data, transaction data, membership data, loyalty data, operational exports.',
      platform_owner_owns: 'Software, infrastructure, brand, platform configuration, package catalog, global settings.',
      platform_role: 'Processor and service operator for business-owned data.',
    },
    tables,
    row_counts: rowCounts,
  }
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadBusinessExcel(filename: string, payload: BusinessDataExport, scope: BusinessExportScope) {
  if (scope !== 'business_full') {
    await exportRowsToXlsx(filename, rowsForScope(payload, scope).map(normalizeRow), scope)
    return
  }

  const workbook = new ExcelJS.Workbook()
  for (const { table } of fullBackupFiles) {
    const rows = tableRows(payload, table).map(normalizeRow)
    const worksheet = workbook.addWorksheet(table.slice(0, 31))
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
    worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(header.length + 2, 14) }))
    rows.forEach((row) => worksheet.addRow(row))
  }
  const manifest = workbook.addWorksheet('backup_manifest')
  manifest.columns = [
    { header: 'key', key: 'key', width: 24 },
    { header: 'value', key: 'value', width: 80 },
  ]
  manifest.addRow({ key: 'generated_at', value: payload.generated_at })
  manifest.addRow({ key: 'business_id', value: payload.business_id })
  manifest.addRow({ key: 'row_counts', value: JSON.stringify(payload.row_counts) })
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

function buildFullBackupZip(payload: BusinessDataExport): ZipFile[] {
  const files: ZipFile[] = fullBackupFiles.map(({ table, path }) => ({
    path,
    content: rowsToCsv(tableRows(payload, table)),
  }))

  files.push({
    path: 'reports.json',
    content: JSON.stringify({
      generated_at: payload.generated_at,
      business_id: payload.business_id,
      row_counts: payload.row_counts,
    }, null, 2),
  })
  files.push({
    path: 'uploaded_files/README.txt',
    content: 'Uploaded file binaries must be generated through trusted storage backup tooling or signed URL jobs. This folder is reserved for tenant-owned uploaded file exports.',
  })
  files.push({
    path: 'backup_manifest.json',
    content: JSON.stringify({
      generated_at: payload.generated_at,
      business_id: payload.business_id,
      ownership_policy: payload.ownership_policy,
      files: [
        ...fullBackupFiles.map((file) => file.path),
        'reports.json',
        'uploaded_files/',
        'backup_manifest.json',
      ],
      row_counts: payload.row_counts,
      expires_after_days: 7,
      notes: [
        'Business owners own this exported business data.',
        'Platform-owned software, infrastructure, package rules, and global settings are not included.',
      ],
    }, null, 2),
  })
  return files
}

export async function downloadBusinessExport(input: {
  businessId: string
  scope: BusinessExportScope
  format: BusinessExportFormat
}) {
  const payload = await exportBusinessData(input.businessId)
  const date = new Date().toISOString().slice(0, 10)
  const baseName = `luxantara-${input.scope}-${input.businessId}-${date}`

  if (input.format === 'csv') {
    exportRowsToCsv(`${baseName}.csv`, rowsForScope(payload, input.scope).map(normalizeRow))
  } else if (input.format === 'excel') {
    await downloadBusinessExcel(`${baseName}.xlsx`, payload, input.scope)
  } else if (input.format === 'json') {
    const jsonPayload = input.scope === 'business_full' ? payload : {
      generated_at: payload.generated_at,
      business_id: payload.business_id,
      scope: input.scope,
      rows: rowsForScope(payload, input.scope),
    }
    downloadJson(`${baseName}.json`, jsonPayload)
  } else if (input.scope === 'business_full') {
    downloadZip(`${baseName}.zip`, buildFullBackupZip(payload))
  } else {
    downloadZip(`${baseName}.zip`, [
      { path: `${input.scope}.csv`, content: rowsToCsv(rowsForScope(payload, input.scope)) },
      {
        path: 'backup_manifest.json',
        content: JSON.stringify({
          generated_at: payload.generated_at,
          business_id: payload.business_id,
          scope: input.scope,
          row_count: rowsForScope(payload, input.scope).length,
        }, null, 2),
      },
    ])
  }

  await logDataExportRequest(input.businessId, `${baseName}.${input.format === 'excel' ? 'xlsx' : input.format}`, payload.row_counts, input.scope, input.format)
}

export async function logDataExportRequest(
  businessId: string,
  fileName: string,
  rowCounts: Record<string, number>,
  scope: BusinessExportScope = 'business_full',
  format: BusinessExportFormat = 'json',
) {
  const { data, error } = await supabase.rpc('log_data_export_request', {
    p_business_id: businessId,
    p_export_scope: scope,
    p_export_format: format,
    p_file_name: fileName,
    p_row_counts: rowCounts,
    p_notes: 'Business owner self-service export',
  })
  if (error) throw error
  return data as string
}

export async function listDataExportRequests(businessId: string): Promise<DataExportRequest[]> {
  const { data, error } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('business_id', businessId)
    .order('requested_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as DataExportRequest[]
}

export async function listPlatformBackupLogs(): Promise<PlatformBackupLog[]> {
  const { data, error } = await supabase
    .from('platform_backup_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as PlatformBackupLog[]
}

export async function logPlatformBackup(input: {
  backup_type: string
  backup_scope: string
  status: string
  storage_location?: string
  checksum?: string
  notes?: string
  retention_until?: string
}) {
  const { data, error } = await supabase.rpc('log_platform_backup', {
    p_backup_type: input.backup_type,
    p_backup_scope: input.backup_scope,
    p_status: input.status,
    p_storage_location: input.storage_location ?? null,
    p_checksum: input.checksum ?? null,
    p_notes: input.notes ?? null,
    p_retention_until: input.retention_until ?? null,
  })
  if (error) throw error
  return data as string
}
