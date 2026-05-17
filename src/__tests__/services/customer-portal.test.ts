import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mb } = vi.hoisted(() => {
  function mb(data: unknown) {
    const result = { data, error: null }
    const b: any = vi.fn(() => b)
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.neq = vi.fn(() => b)
    b.gte = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => b)
    b.single = vi.fn(() => b)
    b.maybeSingle = vi.fn(() => b)
    b.insert = vi.fn(() => b)
    b.update = vi.fn(() => b)
    b.then = (resolve: (v: unknown) => void) => resolve(result)
    return b
  }
  return { mockFrom: vi.fn(() => mb([])), mockRpc: vi.fn(), mb }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-customer' } } }, error: null }) },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import {
  getPublicBusiness, getCustomerBookings, getCustomerMemberships, getCustomerPayments,
  getCustomerPoints, getRedeemableRewards, getCustomerUpcomingBooking, updateCustomerProfile,
  getBusinessServices, getBusinessMembershipPlans,
} from '@/services/customerPortal'

describe('14. Customer portal', () => {
  const businessId = 'biz-1'
  const customerId = 'c1'

  beforeEach(() => { vi.clearAllMocks() })

  it('getPublicBusiness fetches business info without auth', async () => {
    const biz = { id: businessId, name: 'Classic Barber House', business_type: 'barber_shop' }
    mockRpc.mockResolvedValue({ data: biz, error: null })

    const result = await getPublicBusiness(businessId)
    expect(mockRpc).toHaveBeenCalledWith('get_public_business', { p_business_id: businessId })
    expect(result).toEqual(biz)
  })

  it('getCustomerBookings fetches own bookings', async () => {
    const bookings = [{ id: 'bk-1', customer_id: customerId, status: 'confirmed' }]
    mockRpc.mockResolvedValue({ data: bookings, error: null })

    const result = await getCustomerBookings(customerId)
    expect(result).toEqual(bookings)
  })

  it('getCustomerMemberships returns own memberships', async () => {
    const memberships = [{ id: 'm-1', customer_id: customerId, status: 'active' }]
    mockRpc.mockResolvedValue({ data: memberships, error: null })

    const result = await getCustomerMemberships(customerId)
    expect(result).toEqual(memberships)
  })

  it('getCustomerPayments returns own payments', async () => {
    const payments = [{ id: 'pm-1', customer_id: customerId, amount: 25 }]
    mockRpc.mockResolvedValue({ data: payments, error: null })

    const result = await getCustomerPayments(customerId)
    expect(result).toEqual(payments)
  })

  it('getCustomerPoints returns own points balance', async () => {
    const points = { customer_id: customerId, points_balance: 450, total_earned: 500, total_redeemed: 0, total_expired: 0 }
    mockRpc.mockResolvedValue({ data: [points], error: null })

    const result = await getCustomerPoints(customerId)
    expect(result).toEqual(points)
  })

  it('getRedeemableRewards fetches available rewards', async () => {
    const rewards = [{ id: 'r1', name: 'Free Hair Wash', description: null, reward_type: 'free_item', points_required: 100, discount_amount: null, discount_percent: null, free_item: 'Hair Wash' }]
    mockRpc.mockResolvedValue({ data: rewards, error: null })

    const result = await getRedeemableRewards(businessId)
    expect(Array.isArray(result)).toBe(true)
    expect(result.every((r) => r.points_required > 0)).toBe(true)
  })

  it('getCustomerUpcomingBooking returns next booking', async () => {
    const booking = { id: 'bk-1', customer_id: customerId, booking_date: '2026-06-01', start_time: '10:00', status: 'confirmed' }
    mockRpc.mockResolvedValue({ data: [booking], error: null })

    const result = await getCustomerUpcomingBooking(customerId)
    expect(result).toEqual(booking)
  })

  it('updateCustomerProfile updates customer fields', async () => {
    mockFrom.mockReturnValue(mb(null))

    await updateCustomerProfile(customerId, { full_name: 'John Updated', phone: '0111111111' })
    expect(mockFrom).toHaveBeenCalledWith('customers')
  })

  it('getBusinessServices fetches services', async () => {
    const services = [{ id: 'svc-1', name: 'Haircut', price: 25 }]
    mockFrom.mockReturnValue(mb(services))

    const result = await getBusinessServices(businessId)
    expect(result).toEqual(services)
  })

  it('getBusinessMembershipPlans fetches plans', async () => {
    const plans = [{ id: 'p1', name: 'Basic Cut Plan', price: 49, is_active: true }]
    mockFrom.mockReturnValue(mb(plans))

    const result = await getBusinessMembershipPlans(businessId)
    expect(result).toEqual(plans)
  })
})

describe('14b. Customer data isolation', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('customer cannot see other business data via portal', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'not found', code: 'PGRST116' } })
    const result = await getPublicBusiness('non-existent-biz')
    expect(result).toBeNull()
  })
})
