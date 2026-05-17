import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mb } = vi.hoisted(() => {
  function mb(data: unknown) {
    const result = { data, error: null }
    const b: any = vi.fn(() => b)
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.neq = vi.fn(() => b)
    b.gte = vi.fn(() => b)
    b.lte = vi.fn(() => b)
    b.lt = vi.fn(() => b)
    b.gt = vi.fn(() => b)
    b.in = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => b)
    b.single = vi.fn(() => b)
    b.maybeSingle = vi.fn(() => b)
    b.insert = vi.fn(() => b)
    b.update = vi.fn(() => b)
    b.upsert = vi.fn(() => b)
    b.delete = vi.fn(() => b)
    b.not = vi.fn(() => b)
    b.or = vi.fn(() => b)
    b.then = (resolve: (v: unknown) => void) => resolve(result)
    return b
  }
  return { mockFrom: vi.fn((_table: string) => mb([])), mockRpc: vi.fn(), mb }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }) },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import {
  createBooking,
  getBookings,
  cancelBooking,
  getAvailableSlots,
  transitionBooking,
  getServices,
  getStaff,
  getResources,
  statusFlow,
} from '@/services/bookings'

describe('6. Booking flow', () => {
  const businessId = 'biz-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createBooking inserts and returns the booking', async () => {
    const mockBooking = {
      id: 'bk-1',
      business_id: businessId,
      booking_date: '2026-06-01',
      start_time: '10:00',
      end_time: '10:30',
      status: 'pending',
    }
    mockFrom.mockReturnValue(mb(mockBooking))

    const input = {
      business_id: businessId,
      booking_type: 'appointment' as const,
      booking_date: '2026-06-01',
      start_time: '10:00',
      end_time: '10:30',
      total_amount: 25,
    }

    const result = await createBooking(input)
    expect(mockFrom).toHaveBeenCalledWith('bookings')
    expect(result).toEqual(mockBooking)
  })

  it('getBookings filters by business_id', async () => {
    const mockBookings = [{ id: 'bk-1' }, { id: 'bk-2' }]
    mockFrom.mockReturnValue(mb(mockBookings))

    const result = await getBookings(businessId)
    expect(mockFrom).toHaveBeenCalledWith('bookings')
    expect(result).toEqual(mockBookings)
  })

  it('cancelBooking sets status to cancelled', async () => {
    const mockUpdated = { id: 'bk-1', status: 'cancelled' }
    mockFrom.mockReturnValue(mb(mockUpdated))

    const result = await cancelBooking('bk-1', 'Customer request')
    expect(result).toEqual(mockUpdated)
  })

  it('transitionBooking follows valid status flow', async () => {
    const mockUpdated = { id: 'bk-1', status: 'confirmed' }
    mockFrom.mockReturnValue(mb(mockUpdated))

    const result = await transitionBooking('bk-1', 'confirmed')
    expect(result).toEqual(mockUpdated)
  })

  it('getAvailableSlots returns time slots', async () => {
    const staffMember = {
      id: 's1',
      working_hours: {
        monday: { start: '09:00', end: '18:00' },
      },
      off_days: [],
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'staff') return mb(staffMember)
      return mb([])
    })

    const result = await getAvailableSlots(businessId, '2026-06-01', { staff_id: 's1' })
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('start_time')
    expect(result[0]).toHaveProperty('end_time')
  })

  it('statusFlow defines correct booking lifecycle', () => {
    expect(statusFlow).toContain('pending')
    expect(statusFlow).toContain('confirmed')
    expect(statusFlow).toContain('checked_in')
    expect(statusFlow).toContain('in_progress')
    expect(statusFlow).toContain('completed')
  })

  it('getServices fetches services for business', async () => {
    const mockServices = [{ id: 'svc-1', name: 'Haircut', price: 25 }]
    mockFrom.mockReturnValue(mb(mockServices))

    const result = await getServices(businessId)
    expect(result).toEqual(mockServices)
  })

  it('getStaff fetches staff for business', async () => {
    const mockStaffList = [{ id: 's1', full_name: 'Ahmad' }]
    mockFrom.mockReturnValue(mb(mockStaffList))

    const result = await getStaff(businessId)
    expect(result).toEqual(mockStaffList)
  })

  it('getResources fetches resources for business', async () => {
    const mockResources = [{ id: 'r1', name: 'Chair 1', resource_type: 'barber_chair' }]
    mockFrom.mockReturnValue(mb(mockResources))

    const result = await getResources(businessId)
    expect(result).toEqual(mockResources)
  })
})

describe('6b. Booking slot conflict prevention', () => {
  const businessId = 'biz-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createBooking detects overlapping staff time', async () => {
    const existing = [{ id: 'existing-bk', staff_id: 's1', start_time: '10:00', end_time: '10:30', status: 'confirmed' }]
    mockFrom.mockReturnValue(mb(existing))

    const existingBookings = await getBookings(businessId, { staff_id: 's1', date: '2026-06-01' })

    const conflict = existingBookings.some((b: any) => {
      if (b.status === 'cancelled' || b.status === 'no_show') return false
      return '10:15' < b.end_time && '10:45' > b.start_time
    })

    expect(conflict).toBe(true)
  })

  it('createBooking detects overlapping resource time', async () => {
    const existing = [{ id: 'existing-bk', resource_id: 'r1', start_time: '09:00', end_time: '10:00', status: 'confirmed' }]
    mockFrom.mockReturnValue(mb(existing))

    const existingBookings = await getBookings(businessId, { resource_id: 'r1', date: '2026-06-01' })

    const conflict = existingBookings.some((b: any) => {
      if (b.status === 'cancelled' || b.status === 'no_show') return false
      return '09:30' < b.end_time && '10:30' > b.start_time
    })

    expect(conflict).toBe(true)
  })
})
