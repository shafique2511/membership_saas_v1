import { supabase } from '@/lib/supabase'

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

export async function logDataExportRequest(businessId: string, fileName: string, rowCounts: Record<string, number>) {
  const { data, error } = await supabase.rpc('log_data_export_request', {
    p_business_id: businessId,
    p_export_scope: 'business_full',
    p_export_format: 'json',
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
