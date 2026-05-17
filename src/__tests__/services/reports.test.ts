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
    b.in = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => b)
    b.single = vi.fn(() => b)
    b.maybeSingle = vi.fn(() => b)
    b.not = vi.fn(() => b)
    b.then = (resolve: (v: unknown) => void) => resolve(result)
    return b
  }
  return { mockFrom: vi.fn(() => mb([])), mockRpc: vi.fn(), mb }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }) },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import {
  getSalesReport, getBookingReport, getMembershipReport, getCustomerReport,
  getLoyaltyReport, getStaffReport, getPaymentReport, getProfitReport,
  getDashboardSummary, getNoShowReport, exportToCsv,
} from '@/services/reports'

describe('13. Reports', () => {
  const businessId = 'biz-1'

  beforeEach(() => { vi.clearAllMocks() })

  it('getSalesReport returns sales data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockFrom.mockReturnValue(mb([]))

    const result = await getSalesReport(businessId)
    expect(result).toHaveProperty('total_revenue')
    expect(result).toHaveProperty('total_orders')
  })

  it('getBookingReport returns booking metrics', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getBookingReport(businessId)
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('confirmed')
    expect(result).toHaveProperty('completed')
    expect(result).toHaveProperty('cancelled')
    expect(result).toHaveProperty('no_show')
  })

  it('getMembershipReport returns membership stats', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getMembershipReport(businessId)
    expect(result).toHaveProperty('active_members')
    expect(result).toHaveProperty('expired_members')
    expect(result).toHaveProperty('total_members')
  })

  it('getCustomerReport returns customer metrics', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getCustomerReport(businessId)
    expect(result).toHaveProperty('total_customers')
    expect(result).toHaveProperty('active_this_period')
    expect(result).toHaveProperty('new_this_period')
  })

  it('getLoyaltyReport returns loyalty stats', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getLoyaltyReport(businessId)
    expect(result).toHaveProperty('total_points_earned')
    expect(result).toHaveProperty('total_points_redeemed')
  })

  it('getStaffReport returns staff performance', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getStaffReport(businessId)
    expect(result).toHaveProperty('total_staff')
  })

  it('getPaymentReport returns payment data', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getPaymentReport(businessId)
    expect(result).toHaveProperty('total_collected')
    expect(result).toHaveProperty('pending_verification')
  })

  it('getProfitReport returns profit info', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockFrom.mockReturnValue(mb([]))

    const result = await getProfitReport(businessId)
    expect(result).toHaveProperty('total_revenue')
    expect(result).toHaveProperty('estimated_cogs')
    expect(result).toHaveProperty('gross_profit')
  })

  it('getDashboardSummary returns KPIs', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockFrom.mockReturnValue(mb([]))

    const result = await getDashboardSummary(businessId)
    expect(result).toHaveProperty('bookings_today')
    expect(result).toHaveProperty('revenue_today')
    expect(result).toHaveProperty('active_members')
  })

  it('getNoShowReport returns no-show metrics', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getNoShowReport(businessId)
    expect(result).toHaveProperty('total_no_shows')
    expect(result).toHaveProperty('no_show_rate')
  })

  it('exportToCsv creates downloadable CSV', () => {
    const createSpy = vi.spyOn(document, 'createElement')
    const clickSpy = vi.fn()
    createSpy.mockReturnValue({ click: clickSpy, href: '', download: '', style: {} } as never)

    exportToCsv('test.csv', ['Name', 'Value'], [['A', '1'], ['B', '2']])
    expect(createSpy).toHaveBeenCalledWith('a')
    expect(clickSpy).toHaveBeenCalled()
  })
})
