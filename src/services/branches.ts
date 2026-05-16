import { supabase } from '@/lib/supabase'

export interface Branch {
  id: string
  business_id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_main: boolean
  opening_hours: Record<string, unknown>
  status: string
  created_at: string
  updated_at: string
}

export interface BranchStaff {
  id: string
  branch_id: string
  staff_id: string
  is_primary: boolean
  created_at: string
}

export interface BranchStaffWithName extends BranchStaff {
  staff_name: string
  staff_role: string
  staff_phone: string | null
  staff_email: string | null
}

export interface BranchStats {
  staff_count: number
  customer_count: number
  booking_count: number
  revenue: number
  inventory_count: number
  low_stock_count: number
}

export interface BranchComparisonRow {
  branch_id: string
  branch_name: string
  staff_count: number
  customer_count: number
  booking_count: number
  revenue: number
  inventory_count: number
  low_stock_count: number
}

export async function getBranches(businessId: string): Promise<Branch[]> {
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .order('name')
  return data ?? []
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function createBranch(businessId: string, branch: Partial<Branch>): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .insert({ business_id: businessId, ...branch })
  if (error) throw error
}

export async function updateBranch(id: string, updates: Partial<Branch>): Promise<void> {
  const { error } = await supabase.from('branches').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteBranch(id: string): Promise<void> {
  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) throw error
}

export async function getBranchLimit(businessId: string): Promise<number> {
  const { data } = await supabase.rpc('get_branch_limit_count', { p_business_id: businessId })
  return data ?? 1
}

export async function getBranchStats(branchId: string): Promise<BranchStats> {
  const [staffRes, customerRes, bookingRes, revenueRes, invRes, lowStockRes] = await Promise.all([
    supabase.rpc('get_branch_staff_count', { p_branch_id: branchId }),
    supabase.rpc('get_branch_customer_count', { p_branch_id: branchId }),
    supabase.rpc('get_branch_booking_count', { p_branch_id: branchId, p_status: null }),
    supabase.rpc('get_branch_revenue', { p_branch_id: branchId, p_from_date: null, p_to_date: null }),
    supabase.rpc('get_branch_inventory_count', { p_branch_id: branchId }),
    supabase.rpc('get_branch_low_stock_count', { p_branch_id: branchId }),
  ])
  return {
    staff_count: staffRes.data ?? 0,
    customer_count: customerRes.data ?? 0,
    booking_count: bookingRes.data ?? 0,
    revenue: revenueRes.data ?? 0,
    inventory_count: invRes.data ?? 0,
    low_stock_count: lowStockRes.data ?? 0,
  }
}

export async function getBranchDashboard(branchId: string, businessId: string) {
  const branch = await getBranchById(branchId)
  if (!branch) return null

  const [stats, todayBookings, recentOrders] = await Promise.all([
    getBranchStats(branchId),
    supabase.rpc('get_branch_booking_count', { p_branch_id: branchId, p_status: 'confirmed' }),
    supabase
      .from('pos_orders')
      .select('id, order_number, total_amount, payment_status, created_at')
      .eq('business_id', businessId)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const todayCount = todayBookings.data ?? 0

  return {
    branch,
    stats,
    todayBookings: todayCount,
    recentOrders: recentOrders.data ?? [],
  }
}

export async function getBranchStaff(branchId: string): Promise<BranchStaffWithName[]> {
  const { data } = await supabase
    .from('branch_staff')
    .select(`
      *,
      staff:staff_id ( full_name, role, phone, email )
    `)
    .eq('branch_id', branchId)
  return (data ?? []).map((r: Record<string, unknown>) => {
    const s = r.staff as Record<string, unknown> | undefined
    return {
      id: r.id as string,
      branch_id: r.branch_id as string,
      staff_id: r.staff_id as string,
      is_primary: r.is_primary as boolean,
      created_at: r.created_at as string,
      staff_name: (s?.full_name as string) ?? '',
      staff_role: (s?.role as string) ?? '',
      staff_phone: (s?.phone as string | null) ?? null,
      staff_email: (s?.email as string | null) ?? null,
    }
  })
}

export async function assignStaffToBranch(branchId: string, staffId: string, isPrimary?: boolean): Promise<void> {
  const { error } = await supabase
    .from('branch_staff')
    .insert({ branch_id: branchId, staff_id: staffId, is_primary: isPrimary ?? false })
  if (error) throw error
}

export async function removeStaffFromBranch(id: string): Promise<void> {
  const { error } = await supabase.from('branch_staff').delete().eq('id', id)
  if (error) throw error
}

export async function getBranchCustomers(branchId: string, businessId: string) {
  const { data } = await supabase
    .from('customers')
    .select('id, full_name, phone, email, total_spent, visit_count, status, created_at')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .order('full_name')
  return data ?? []
}

export async function getBranchBookings(branchId: string, businessId: string, options?: { status?: string; limit?: number }) {
  let q = supabase
    .from('bookings')
    .select('*, customer:customer_id ( full_name ), staff:staff_id ( full_name ), service:service_id ( name )')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
  if (options?.status) q = q.eq('status', options.status)
  if (options?.limit) q = q.limit(options.limit)
  const { data } = await q
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    booking_date: r.booking_date as string,
    start_time: r.start_time as string,
    end_time: r.end_time as string,
    status: r.status as string,
    total_amount: r.total_amount as number,
    customer_name: ((r.customer as Record<string, unknown> | undefined)?.full_name as string) ?? '-',
    staff_name: ((r.staff as Record<string, unknown> | undefined)?.full_name as string) ?? '-',
    service_name: ((r.service as Record<string, unknown> | undefined)?.name as string) ?? '-',
    created_at: r.created_at as string,
  }))
}

export async function getBranchInventory(branchId: string, businessId: string) {
  const { data } = await supabase
    .from('products')
    .select('id, name, category, sku, selling_price, stock_quantity, low_stock_threshold, is_active')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .order('name')
  return (data ?? []).map((p) => ({
    ...p,
    is_low_stock: p.stock_quantity <= p.low_stock_threshold,
  }))
}

export async function getBranchSales(branchId: string, businessId: string, options?: { days?: number }) {
  const days = options?.days ?? 30
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const { data } = await supabase
    .from('pos_orders')
    .select('id, order_number, total_amount, payment_status, order_status, created_at')
    .eq('business_id', businessId)
    .eq('branch_id', branchId)
    .gte('created_at', fromDate.toISOString())
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getBranchComparison(businessId: string): Promise<BranchComparisonRow[]> {
  const branches = await getBranches(businessId)
  const rows = await Promise.all(
    branches.map(async (b) => {
      const stats = await getBranchStats(b.id)
      return {
        branch_id: b.id,
        branch_name: b.name,
        ...stats,
      }
    })
  )
  return rows
}

export async function getAvailableStaffForBranch(businessId: string, branchId: string) {
  const assigned = await getBranchStaff(branchId)
  const assignedIds = assigned.map((s) => s.staff_id)
  const { data } = await supabase
    .from('staff')
    .select('id, full_name, role, phone, email')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('full_name')
  return (data ?? []).filter((s) => !assignedIds.includes(s.id))
}
