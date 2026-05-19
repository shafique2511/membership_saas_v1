import { supabase } from '@/lib/supabase'

export type BookingType = 'appointment' | 'table' | 'room' | 'event' | 'walk_in'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type WaitlistStatus = 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled'

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

export interface WaitlistEntryRow {
  id: string
  business_id: string
  branch_id: string | null
  customer_id: string | null
  service_id: string | null
  staff_id: string | null
  resource_id: string | null
  booking_type: BookingType
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  requested_date: string | null
  requested_time_start: string | null
  requested_time_end: string | null
  party_size: number
  priority: number
  status: WaitlistStatus
  notes: string | null
  expires_at: string | null
  notified_at: string | null
  converted_booking_id: string | null
  created_at: string
  updated_at: string
  customers?: { full_name: string; phone: string | null; email: string | null } | { full_name: string; phone: string | null; email: string | null }[] | null
  services?: { name: string; duration_minutes: number; price: number } | { name: string; duration_minutes: number; price: number }[] | null
  staff?: { full_name: string } | { full_name: string }[] | null
  resources?: { name: string; resource_type: string } | { name: string; resource_type: string }[] | null
  branches?: { name: string } | { name: string }[] | null
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
  payment_status?: PaymentStatus
  status?: BookingStatus
}

interface BookingRulesRow {
  slot_duration_minutes: number
  buffer_time_minutes: number
  min_booking_notice_hours: number
  max_advance_days: number
  max_bookings_per_slot?: number | null
  auto_confirm: boolean
  deposit_required: boolean
  deposit_percentage: number
  allow_walk_in: boolean
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

export interface WaitlistCreateInput {
  business_id: string
  full_name: string
  phone: string
  email?: string | null
  branch_id?: string | null
  staff_id?: string | null
  service_id?: string | null
  resource_id?: string | null
  booking_type?: BookingType
  requested_date?: string | null
  requested_time_start?: string | null
  requested_time_end?: string | null
  notes?: string | null
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
  const rules = await getBookingRules(input.business_id)
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
      status: input.status ?? (rules?.auto_confirm ? 'confirmed' : 'pending'),
    })
    .select('*,customers(full_name,phone,email),services(name,duration_minutes,price),staff(full_name),resources(name,resource_type),branches(name)')
    .single()

  if (error) throw error
  return data as BookingRow
}

export async function createGuestBooking(input: {
  business_id: string
  full_name: string
  phone: string
  email?: string | null
  branch_id?: string | null
  staff_id?: string | null
  service_id?: string | null
  resource_id?: string | null
  booking_type?: BookingType
  booking_date: string
  start_time: string
  end_time: string
  notes?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_guest_booking', {
    p_business_id: input.business_id,
    p_full_name: input.full_name,
    p_phone: input.phone,
    p_email: input.email ?? '',
    p_branch_id: input.branch_id ?? null,
    p_staff_id: input.staff_id ?? null,
    p_service_id: input.service_id ?? null,
    p_resource_id: input.resource_id ?? null,
    p_booking_type: input.booking_type ?? 'appointment',
    p_booking_date: input.booking_date,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_notes: input.notes ?? null,
  })

  if (error) throw error
  return data as string
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
    status: 'cancelled',
    notes: notes ?? null,
  })
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}

export async function transitionBooking(id: string, status: BookingStatus): Promise<BookingRow> {
  return updateBooking(id, { status })
}

export async function getWaitlistEntries(businessId: string, status?: WaitlistStatus | WaitlistStatus[]): Promise<WaitlistEntryRow[]> {
  let query = supabase
    .from('waitlist_entries')
    .select('*,customers(full_name,phone,email),services(name,duration_minutes,price),staff(full_name),resources(name,resource_type),branches(name)')
    .eq('business_id', businessId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (status) {
    if (Array.isArray(status)) query = query.in('status', status)
    else query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as WaitlistEntryRow[]
}

export async function createWaitlistEntry(input: WaitlistCreateInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_waitlist_entry', {
    p_business_id: input.business_id,
    p_full_name: input.full_name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_branch_id: input.branch_id ?? null,
    p_staff_id: input.staff_id ?? null,
    p_service_id: input.service_id ?? null,
    p_resource_id: input.resource_id ?? null,
    p_booking_type: input.booking_type ?? 'appointment',
    p_requested_date: input.requested_date ?? null,
    p_requested_time_start: input.requested_time_start ?? null,
    p_requested_time_end: input.requested_time_end ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) throw error
  return data as string
}

export async function updateWaitlistEntry(id: string, updates: Partial<WaitlistEntryRow>): Promise<void> {
  const { error } = await supabase.from('waitlist_entries').update(updates).eq('id', id)
  if (error) throw error
}

export async function convertWaitlistToBooking(waitlistId: string): Promise<string> {
  const { data, error } = await supabase.rpc('convert_waitlist_to_booking', {
    p_waitlist_id: waitlistId,
  })

  if (error) throw error
  return data as string
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
  const rules = await getBookingRules(businessId)
  let durationMin = 60

  if (serviceId) {
    const { data: svc } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (svc) durationMin = svc.duration_minutes
  }
  const slotStep = Math.max(5, rules?.slot_duration_minutes ?? 30)
  const bufferMinutes = Math.max(0, rules?.buffer_time_minutes ?? 0)

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

  if (staff.length === 0) {
    let branchQuery = supabase
      .from('branches')
      .select('opening_hours')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .limit(1)

    if (options.branch_id) branchQuery = branchQuery.eq('id', options.branch_id)
    const { data: branch } = await branchQuery.maybeSingle()

    staff = [{
      id: '__unassigned__',
      working_hours: normalizeOpeningHours(branch?.opening_hours as Record<string, unknown> | undefined),
      off_days: [],
    }]
  }

  const { data: existing } = await supabase
    .from('bookings')
    .select('start_time,end_time,staff_id,resource_id')
    .eq('business_id', businessId)
    .eq('booking_date', date)
    .not('status', 'in', '("cancelled","no_show")')

  const existingMap = new Map<string, { start: string; end: string }[]>()
  ;(existing ?? []).forEach((b) => {
    const keys = [
      b.staff_id ? `staff:${b.staff_id}` : null,
      b.resource_id ? `resource:${b.resource_id}` : null,
      'business',
    ].filter(Boolean) as string[]
    keys.forEach((key) => {
      if (!existingMap.has(key)) existingMap.set(key, [])
      existingMap.get(key)!.push({ start: b.start_time.slice(0, 5), end: b.end_time.slice(0, 5) })
    })
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
    const existingSlots = [
      ...(s.id === '__unassigned__' && !options.resource_id ? existingMap.get('business') ?? [] : existingMap.get(`staff:${s.id}`) ?? []),
      ...(options.resource_id ? existingMap.get(`resource:${options.resource_id}`) ?? [] : []),
    ]

    for (let m = workStart; m + durationMin <= workEnd; m += slotStep) {
      const slotStart = minutesToTime(m)
      const slotEnd = minutesToTime(m + durationMin)

      const conflict = existingSlots.some((ex) => {
        const exStart = timeToMinutes(ex.start)
        const exEnd = timeToMinutes(ex.end)
        return m < exEnd - bufferMinutes && m + durationMin > exStart + bufferMinutes
      })

      if (!conflict) {
        slots.push({
          start_time: slotStart,
          end_time: slotEnd,
          staff_id: s.id === '__unassigned__' ? null : s.id,
          resource_id: options.resource_id ?? null,
        })
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

async function getBookingRules(businessId: string): Promise<BookingRulesRow | null> {
  const { data } = await supabase
    .from('booking_rules')
    .select('slot_duration_minutes,buffer_time_minutes,min_booking_notice_hours,max_advance_days,max_bookings_per_slot,auto_confirm,deposit_required,deposit_percentage,allow_walk_in')
    .eq('business_id', businessId)
    .maybeSingle()

  return (data ?? null) as BookingRulesRow | null
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

function defaultWorkingHours(): Record<string, { start: string; end: string }> {
  return {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
    saturday: { start: '09:00', end: '17:00' },
    sunday: { start: '09:00', end: '17:00' },
  }
}

function normalizeOpeningHours(hours?: Record<string, unknown>): Record<string, { start: string; end: string }> {
  if (!hours) return defaultWorkingHours()

  return Object.entries(hours).reduce<Record<string, { start: string; end: string }>>((acc, [day, value]) => {
    const dayHours = value as { start?: string; end?: string; open?: string; close?: string }
    const start = dayHours.start ?? dayHours.open
    const end = dayHours.end ?? dayHours.close
    if (start && end) acc[day] = { start, end }
    return acc
  }, {})
}
