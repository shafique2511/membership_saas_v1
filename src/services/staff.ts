import { supabase } from '@/lib/supabase'

export interface Staff {
  id: string
  business_id: string
  branch_id: string | null
  user_id: string | null
  full_name: string
  phone: string | null
  email: string | null
  role: string
  commission_rate: number
  commission_type: 'fixed' | 'percentage'
  target_sales: number
  target_bookings: number
  working_hours: Record<string, unknown>
  off_days: string[]
  status: 'active' | 'inactive' | 'suspended'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StaffService {
  id: string
  staff_id: string
  service_id: string
  commission_type: 'fixed' | 'percentage'
  commission_value: number
}

export interface CommissionRule {
  id: string
  business_id: string
  name: string
  commission_type: string
  target_type: string
  target_id: string | null
  rate: number
  is_active: boolean
}

export interface CommissionRecord {
  id: string
  business_id: string
  staff_id: string
  source_type: string
  source_id: string | null
  commission_type: string
  commission_amount: number
  status: 'pending' | 'approved' | 'paid'
  paid_at: string | null
  notes: string | null
  created_at: string
}

export async function getStaff(businessId: string, filters?: { branch_id?: string; status?: string; search?: string }) {
  let q = supabase
    .from('staff')
    .select('*, branches(name)')
    .eq('business_id', businessId)
    .order('full_name')
  if (filters?.branch_id) q = q.eq('branch_id', filters.branch_id)
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters?.search) q = q.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  const { data } = await q
  return data ?? []
}

export async function getStaffMember(staffId: string) {
  const { data } = await supabase
    .from('staff')
    .select('*, branches(name)')
    .eq('id', staffId)
    .single()
  return data as Staff & { branches?: { name: string }[] } | null
}

export async function createStaff(data: Partial<Staff>) {
  const { error } = await supabase.from('staff').insert(data)
  if (error) throw error
}

export async function updateStaff(id: string, data: Partial<Staff>) {
  const { error } = await supabase.from('staff').update(data).eq('id', id)
  if (error) throw error
}

export async function getStaffServices(staffId: string) {
  const { data } = await supabase
    .from('staff_services')
    .select('*, services(name, price)')
    .eq('staff_id', staffId)
  return data ?? []
}

export async function assignStaffService(data: { staff_id: string; service_id: string; commission_type: string; commission_value: number }) {
  const { error } = await supabase.from('staff_services').upsert(data, { onConflict: 'staff_id,service_id' })
  if (error) throw error
}

export async function removeStaffService(id: string) {
  await supabase.from('staff_services').delete().eq('id', id)
}

export async function getCommissionRules(businessId: string) {
  const { data } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('business_id', businessId)
    .order('name')
  return data ?? []
}

export async function createCommissionRule(data: Partial<CommissionRule>) {
  const { error } = await supabase.from('commission_rules').insert(data)
  if (error) throw error
}

export async function updateCommissionRule(id: string, data: Partial<CommissionRule>) {
  await supabase.from('commission_rules').update(data).eq('id', id)
}

export async function deleteCommissionRule(id: string) {
  await supabase.from('commission_rules').delete().eq('id', id)
}

export async function getCommissionRecords(businessId: string, filters?: { staff_id?: string; status?: string; date_from?: string; date_to?: string }) {
  let q = supabase
    .from('commission_records')
    .select('*, staff(full_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (filters?.staff_id) q = q.eq('staff_id', filters.staff_id)
  if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters?.date_from) q = q.gte('created_at', filters.date_from)
  if (filters?.date_to) q = q.lte('created_at', filters.date_to + 'T23:59:59')
  const { data } = await q
  return data ?? []
}

export async function updateCommissionRecord(id: string, status: string) {
  const upd: Record<string, unknown> = { status }
  if (status === 'paid') upd.paid_at = new Date().toISOString()
  await supabase.from('commission_records').update(upd).eq('id', id)
}

export async function getStaffPerformance(businessId: string, staffId?: string) {
  let q = supabase
    .from('staff')
    .select('id, full_name, role, commission_rate, target_sales, target_bookings, status')
    .eq('business_id', businessId)
    .eq('status', 'active')
  if (staffId) q = q.eq('id', staffId)
  const staffList = (await q).data ?? []

  const result = []
  for (const s of staffList) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, total_amount, status')
      .eq('business_id', businessId)
      .eq('staff_id', s.id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
    const { data: commissions } = await supabase
      .from('commission_records')
      .select('commission_amount, status')
      .eq('staff_id', s.id)
    const { data: orders } = await supabase
      .from('pos_orders')
      .select('total_amount')
      .eq('business_id', businessId)
      .eq('staff_id', s.id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const completedBookings = (bookings ?? []).filter((b) => b.status === 'completed').length
    const totalSales30d = (orders ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0)
    const pendingCommission = (commissions ?? []).filter((c) => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0)
    const totalCommission = (commissions ?? []).reduce((sum, c) => sum + Number(c.commission_amount), 0)
    const bookingRevenue30d = (bookings ?? []).filter((b) => b.status === 'completed').reduce((sum, b) => sum + Number(b.total_amount), 0)

    result.push({
      ...s,
      completed_bookings_30d: completedBookings,
      booking_revenue_30d: bookingRevenue30d,
      sales_30d: totalSales30d,
      pending_commission: pendingCommission,
      total_commission: totalCommission,
    })
  }
  return result
}

export async function getStaffAppointments(staffId: string, dateFrom: string, dateTo: string) {
  const { data } = await supabase
    .from('bookings')
    .select('*, customers(full_name), services(name)')
    .eq('staff_id', staffId)
    .gte('booking_date', dateFrom)
    .lte('booking_date', dateTo)
    .order('booking_date')
    .order('start_time')
  return data ?? []
}
