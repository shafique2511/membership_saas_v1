import { supabase } from '@/lib/supabase'

export type BookingType = 'appointment' | 'table' | 'room' | 'event' | 'walk_in'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export interface BookingRow {
  id: string
  business_id: string
  branch_id: string | null
  customer_id: string | null
  staff_id: string | null
  service_id: string | null
  resource_id: string | null
  booking_type: BookingType
  booking_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  notes: string | null
  deposit_amount: number
  total_amount: number
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
  customers?: { id: string; full_name: string; phone: string | null; email: string | null } | { id: string; full_name: string; phone: string | null; email: string | null }[] | null
  services?: { id: string; name: string; duration_minutes: number; price: number } | { id: string; name: string; duration_minutes: number; price: number }[] | null
  staff?: { id: string; full_name: string } | { id: string; full_name: string }[] | null
  resources?: { id: string; name: string; resource_type: string } | { id: string; name: string; resource_type: string }[] | null
  branches?: { id: string; name: string } | { id: string; name: string }[] | null
}

export interface ServiceRow {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  category: string | null
  description: string | null
  duration_minutes: number
  price: number
  is_bookable: boolean
  is_active: boolean
}

export interface StaffRow {
  id: string
  business_id: string
  branch_id: string | null
  full_name: string
  phone: string | null
  email: string | null
  role: string
  working_hours: Record<string, unknown>
  off_days: string[]
  status: string
}

export interface ResourceRow {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  resource_type: string
  capacity: number
  description: string | null
  status: string
}

export interface BranchRow {
  id: string
  business_id: string
  name: string
  address: string | null
  opening_hours: Record<string, unknown>
  status: string
}

export interface CustomerRow {
  id: string
  business_id: string
  full_name: string
  phone: string | null
  email: string | null
}

export interface AvailableSlot {
  start_time: string
  end_time: string
  staff_id?: string | null
  resource_id?: string | null
}

export interface BookingCreateInput {
  business_id: string
  branch_id?: string | null
  customer_id?: string | null
  staff_id?: string | null
  service_id?: string | null
  resource_id?: string | null
  booking_type: BookingType
  booking_date: string
  start_time: string
  end_time: string
  notes?: string | null
  deposit_amount?: number
  total_amount?: number
  status?: BookingStatus
}

export interface BookingUpdateInput {
  branch_id?: string | null
  staff_id?: string | null
  service_id?: string | null
  resource_id?: string | null
  booking_date?: string
  start_time?: string
  end_time?: string
  notes?: string | null
  deposit_amount?: number
  total_amount?: number
}

export interface BookingFilters {
  date?: string
  date_from?: string
  date_to?: string
  staff_id?: string
  resource_id?: string
  branch_id?: string
  status?: BookingStatus | BookingStatus[]
  booking_type?: BookingType
  customer_id?: string
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
    case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'
    case 'checked_in': return 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200'
    case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
    case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200'
    case 'no_show': return 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200'
    default: return 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200'
  }
}

export const statusFlow: BookingStatus[] = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed']

export function nextStatuses(current: BookingStatus): BookingStatus[] {
  switch (current) {
    case 'pending': return ['confirmed', 'cancelled']
    case 'confirmed': return ['checked_in', 'cancelled']
    case 'checked_in': return ['in_progress', 'cancelled', 'no_show']
    case 'in_progress': return ['completed', 'cancelled']
    default: return []
  }
}

export async function getBookings(businessId: string, filters: BookingFilters = {}): Promise<BookingRow[]> {
  let query = supabase
    .from('bookings')
    .select('*,customers(full_name,phone,email),services(name,duration_minutes,price),staff(full_name),resources(name,resource_type),branches(name)')
    .eq('business_id', businessId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (filters.date) {
    query = query.eq('booking_date', filters.date)
  } else {
    if (filters.date_from) query = query.gte('booking_date', filters.date_from)
    if (filters.date_to) query = query.lte('booking_date', filters.date_to)
  }

  if (filters.staff_id) query = query.eq('staff_id', filters.staff_id)
  if (filters.resource_id) query = query.eq('resource_id', filters.resource_id)
  if (filters.branch_id) query = query.eq('branch_id', filters.branch_id)
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id)
  if (filters.booking_type) query = query.eq('booking_type', filters.booking_type)
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as BookingRow[]
}

export async function getBooking(id: string): Promise<BookingRow | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*,customers(full_name,phone,email),services(name,duration_minutes,price),staff(full_name),resources(name,resource_type),branches(name)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as BookingRow
}

export async function createBooking(input: BookingCreateInput): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      business_id: input.business_id,
      branch_id: input.branch_id ?? null,
      customer_id: input.customer_id ?? null,
      staff_id: input.staff_id ?? null,
      service_id: input.service_id ?? null,
      resource_id: input.resource_id ?? null,
      booking_type: input.booking_type,
      booking_date: input.booking_date,
      start_time: input.start_time,
      end_time: input.end_time,
      notes: input.notes ?? null,
      deposit_amount: input.deposit_amount ?? 0,
      total_amount: input.total_amount ?? 0,
      status: input.status ?? 'pending',
    })
    .select('*,customers(full_name,phone,email),services(name,duration_minutes,price),staff(full_name),resources(name,resource_type),branches(name)')
    .single()

  if (error) throw error
  return data as BookingRow
}

export async function updateBooking(id: string, input: BookingUpdateInput): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('bookings')
    .update(input)
    .eq('id', id)
    .select('*,customers(full_name,phone,email),services(name,duration_minutes,price),staff(full_name),resources(name,resource_type),branches(name)')
    .single()

  if (error) throw error
  return data as BookingRow
}

export async function cancelBooking(id: string, notes?: string): Promise<BookingRow> {
  return updateBooking(id, {
    status: 'cancelled' as unknown as BookingUpdateInput['staff_id'],
    notes: notes ?? null,
  } as unknown as BookingUpdateInput)
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}

export async function transitionBooking(id: string, status: BookingStatus): Promise<BookingRow> {
  return updateBooking(id as unknown as string, { status: status as unknown as BookingUpdateInput['staff_id'] } as unknown as BookingUpdateInput)
}

export async function getAvailableSlots(
  businessId: string,
  date: string,
  options: {
    service_id?: string
    staff_id?: string
    resource_id?: string
    branch_id?: string
  } = {},
): Promise<AvailableSlot[]> {
  const serviceId = options.service_id
  let durationMin = 60

  if (serviceId) {
    const { data: svc } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (svc) durationMin = svc.duration_minutes
  }

  let staff: { id: string; working_hours: Record<string, unknown>; off_days: string[] }[] = []

  if (options.staff_id) {
    const { data: s } = await supabase.from('staff').select('id,working_hours,off_days').eq('id', options.staff_id).single()
    if (s) staff = [s as { id: string; working_hours: Record<string, unknown>; off_days: string[] }]
  } else {
    const { data: allStaff } = await supabase
      .from('staff')
      .select('id,working_hours,off_days')
      .eq('business_id', businessId)
      .eq('status', 'active')

    staff = (allStaff ?? []) as { id: string; working_hours: Record<string, unknown>; off_days: string[] }[]
  }

  const { data: existing } = await supabase
    .from('bookings')
    .select('start_time,end_time,staff_id')
    .eq('business_id', businessId)
    .eq('booking_date', date)
    .not('status', 'in', '("cancelled","no_show")')

  const existingMap = new Map<string, { start: string; end: string }[]>()
  ;(existing ?? []).forEach((b) => {
    const sid = b.staff_id ?? 'none'
    if (!existingMap.has(sid)) existingMap.set(sid, [])
    existingMap.get(sid)!.push({ start: b.start_time.slice(0, 5), end: b.end_time.slice(0, 5) })
  })

  const dayOfWeek = new Date(date).toLocaleString('en', { weekday: 'long' }).toLowerCase()
  const slots: AvailableSlot[] = []

  staff.forEach((s) => {
    const wh = s.working_hours ?? {}
    const dayHours = wh[dayOfWeek] as { start?: string; end?: string } | undefined
    if (!dayHours?.start || !dayHours?.end) return

    const offDays: string[] = s.off_days ?? []
    if (offDays.includes(date)) return

    const workStart = timeToMinutes(dayHours.start)
    const workEnd = timeToMinutes(dayHours.end)
    const existingSlots = existingMap.get(s.id) ?? []
    const bufferMinutes = 0

    for (let m = workStart; m + durationMin <= workEnd; m += 30) {
      const slotStart = minutesToTime(m)
      const slotEnd = minutesToTime(m + durationMin)

      const conflict = existingSlots.some((ex) => {
        const exStart = timeToMinutes(ex.start)
        const exEnd = timeToMinutes(ex.end)
        return m < exEnd - bufferMinutes && m + durationMin > exStart + bufferMinutes
      })

      if (!conflict) {
        slots.push({ start_time: slotStart, end_time: slotEnd, staff_id: s.id })
      }
    }
  })

  return slots
}

export async function getServices(businessId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .eq('is_bookable', true)
    .order('name')

  if (error) throw error
  return (data ?? []) as ServiceRow[]
}

export async function getStaff(businessId: string) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('full_name')

  if (error) throw error
  return (data ?? []) as StaffRow[]
}

export async function getResources(businessId: string) {
  const { data, error } = await supabase
    .from('bookable_resources')
    .select('*')
    .eq('business_id', businessId)
    .neq('status', 'maintenance')
    .order('name')

  if (error) throw error
  return (data ?? []) as ResourceRow[]
}

export async function getBranches(businessId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('name')

  if (error) throw error
  return (data ?? []) as BranchRow[]
}

export async function searchCustomers(businessId: string, query: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('id,full_name,phone,email')
    .eq('business_id', businessId)
    .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error) throw error
  return (data ?? []) as CustomerRow[]
}

export async function createCustomer(input: {
  business_id: string
  full_name: string
  phone?: string
  email?: string
}) {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      business_id: input.business_id,
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
    })
    .select('id,full_name,phone,email')
    .single()

  if (error) throw error
  return data as CustomerRow
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
