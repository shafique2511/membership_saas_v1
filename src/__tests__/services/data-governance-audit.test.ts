import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, calls } = vi.hoisted(() => {
  const tableData: Record<string, any[]> = {
    businesses: [
      { id: 'biz-a', name: 'Business A' },
      { id: 'biz-b', name: 'Business B' },
    ],
    customers: [
      { id: 'cust-a', business_id: 'biz-a', full_name: 'A Customer' },
      { id: 'cust-b', business_id: 'biz-b', full_name: 'B Customer' },
    ],
    bookings: [
      { id: 'booking-a', business_id: 'biz-a', customer_id: 'cust-a' },
      { id: 'booking-b', business_id: 'biz-b', customer_id: 'cust-b' },
    ],
    pos_orders: [
      { id: 'order-a', business_id: 'biz-a', order_number: 'POS-A' },
      { id: 'order-b', business_id: 'biz-b', order_number: 'POS-B' },
    ],
    pos_order_items: [
      { id: 'item-a', order_id: 'order-a', item_name: 'Latte' },
      { id: 'item-b', order_id: 'order-b', item_name: 'Pomade' },
    ],
    branches: [
      { id: 'branch-a', business_id: 'biz-a', name: 'A Main' },
      { id: 'branch-b', business_id: 'biz-b', name: 'B Main' },
    ],
    branch_staff: [
      { id: 'branch-staff-a', branch_id: 'branch-a', staff_id: 'staff-a' },
      { id: 'branch-staff-b', branch_id: 'branch-b', staff_id: 'staff-b' },
    ],
    audit_logs: [
      { id: 'log-a', business_id: 'biz-a', user_id: 'u-a', action: 'created_booking', table_name: 'bookings', record_id: 'booking-a', old_data: null, new_data: {}, ip_address: null, user_agent: null, created_at: '2026-01-01' },
      { id: 'log-b', business_id: 'biz-b', user_id: 'u-b', action: 'created_booking', table_name: 'bookings', record_id: 'booking-b', old_data: null, new_data: {}, ip_address: null, user_agent: null, created_at: '2026-01-01' },
    ],
    user_profiles: [
      { id: 'u-a', full_name: 'Owner A', email: 'a@example.test' },
      { id: 'u-b', full_name: 'Owner B', email: 'b@example.test' },
    ],
  }
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []

  function makeBuilder(table: string) {
    const filters: Array<(row: any) => boolean> = []
    let limitCount: number | null = null

    const builder: any = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn((count: number) => {
        limitCount = count
        calls.push({ table, method: 'limit', args: [count] })
        return builder
      }),
      eq: vi.fn((column: string, value: unknown) => {
        calls.push({ table, method: 'eq', args: [column, value] })
        filters.push((row) => row[column] === value)
        return builder
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        calls.push({ table, method: 'in', args: [column, values] })
        filters.push((row) => values.includes(row[column]))
        return builder
      }),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      then: (resolve: (value: unknown) => void) => {
        let rows = [...(tableData[table] ?? [])]
        for (const filter of filters) rows = rows.filter(filter)
        if (limitCount !== null) rows = rows.slice(0, limitCount)
        resolve({ data: rows, error: null })
      },
    }
    return builder
  }

  return {
    tableData,
    calls,
    mockFrom: vi.fn((table: string) => makeBuilder(table)),
    mockRpc: vi.fn().mockResolvedValue({ data: 'rpc-id', error: null }),
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import { getBusinessAuditLogs } from '@/services/auditLogs'
import { createPlatformBackupRequest } from '@/services/admin'
import { exportBusinessData, logDataExportRequest } from '@/services/dataGovernance'

describe('18. Backup export data isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
  })

  it('owner export only includes own business rows and child POS rows', async () => {
    const exportData = await exportBusinessData('biz-a')

    expect(exportData.business_id).toBe('biz-a')
    expect(exportData.tables.businesses).toEqual([{ id: 'biz-a', name: 'Business A' }])
    expect(exportData.tables.customers).toEqual([{ id: 'cust-a', business_id: 'biz-a', full_name: 'A Customer' }])
    expect(exportData.tables.bookings).toEqual([{ id: 'booking-a', business_id: 'biz-a', customer_id: 'cust-a' }])
    expect(exportData.tables.pos_order_items).toEqual([{ id: 'item-a', order_id: 'order-a', item_name: 'Latte' }])
    expect(exportData.tables.branch_staff).toEqual([{ id: 'branch-staff-a', branch_id: 'branch-a', staff_id: 'staff-a' }])
    expect(calls).toContainEqual({ table: 'customers', method: 'eq', args: ['business_id', 'biz-a'] })
    expect(calls).toContainEqual({ table: 'pos_order_items', method: 'in', args: ['order_id', ['order-a']] })
    expect(calls).toContainEqual({ table: 'branch_staff', method: 'in', args: ['branch_id', ['branch-a']] })
  })

  it('logs business export through server-side RPC', async () => {
    await logDataExportRequest('biz-a', 'export.json', { customers: 1 }, 'customers', 'json')

    expect(mockRpc).toHaveBeenCalledWith('log_data_export_request', {
      p_business_id: 'biz-a',
      p_export_scope: 'customers',
      p_export_format: 'json',
      p_file_name: 'export.json',
      p_row_counts: { customers: 1 },
      p_notes: 'Business owner self-service export',
    })
  })
})

describe('20. Audit logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    calls.length = 0
  })

  it('owner audit view is scoped to current business and enriches user profile', async () => {
    const logs = await getBusinessAuditLogs('biz-a')

    expect(logs).toHaveLength(1)
    expect(logs[0].business_id).toBe('biz-a')
    expect(logs[0].user_profiles).toEqual({ full_name: 'Owner A', email: 'a@example.test' })
    expect(calls).toContainEqual({ table: 'audit_logs', method: 'eq', args: ['business_id', 'biz-a'] })
    expect(calls).toContainEqual({ table: 'user_profiles', method: 'in', args: ['id', ['u-a']] })
  })
})

describe('18b. Full platform backup request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses platform scope only through guarded backup RPC', async () => {
    await createPlatformBackupRequest({
      request_type: 'full_platform',
      reason: 'Scheduled validation backup',
      password_confirmed: true,
      two_factor_confirmed: true,
    })

    expect(mockRpc).toHaveBeenCalledWith('create_backup_request', expect.objectContaining({
      p_request_type: 'full_platform',
      p_scope: 'platform',
      p_business_id: null,
      p_password_confirmed: true,
      p_two_factor_confirmed: true,
    }))
  })
}
)
