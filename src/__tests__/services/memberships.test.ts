import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mb } = vi.hoisted(() => {
  function mb(data: unknown) {
    const result = { data, error: null }
    const b: any = vi.fn(() => b)
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => b)
    b.single = vi.fn(() => b)
    b.maybeSingle = vi.fn(() => b)
    b.insert = vi.fn(() => b)
    b.update = vi.fn(() => b)
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
  getPlans,
  createPlan,
  assignMembership,
  freezeMembership,
  cancelMembership,
  renewMembership,
  getUsage,
  getMembershipStatusColor,
  planTypeLabels,
} from '@/services/memberships'

describe('7. Membership flow', () => {
  const businessId = 'biz-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getPlans fetches membership plans', async () => {
    const plans = [{ id: 'p1', name: 'Basic', price: 49, plan_type: 'subscription' }]
    mockFrom.mockReturnValue(mb(plans))

    const result = await getPlans(businessId)
    expect(result).toEqual(plans)
  })

  it('createPlan inserts a new plan', async () => {
    const newPlan = { id: 'p-new', name: 'Premium', plan_type: 'subscription', price: 99, duration_days: 30 }
    mockFrom.mockReturnValue(mb(newPlan))

    const result = await createPlan({
      business_id: businessId,
      name: 'Premium',
      plan_type: 'subscription',
      price: 99,
      duration_days: 30,
    })
    expect(result).toEqual(newPlan)
  })

  it('assignMembership creates membership with correct initial balance', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'membership_plans') return mb({ id: 'p1', name: 'Basic Cut Plan', plan_type: 'prepaid_credit', credit_amount: 100, visit_limit: null, duration_days: 30 })
      if (table === 'memberships') return mb({
        id: 'm-new',
        business_id: businessId,
        customer_id: 'c1',
        plan_id: 'p1',
        status: 'active',
        remaining_credit: 100,
        remaining_visits: 0,
      })
      return mb([])
    })

    const result = await assignMembership({
      business_id: businessId,
      customer_id: 'c1',
      plan_id: 'p1',
      auto_renew: true,
    })
    expect(result.remaining_credit).toBe(100)
    expect(result.status).toBe('active')
  })

  it('freezeMembership updates status to frozen', async () => {
    mockFrom.mockReturnValue(mb({ id: 'm1', status: 'frozen' }))

    const result = await freezeMembership('m1')
    expect(result.status).toBe('frozen')
  })

  it('cancelMembership updates status to cancelled', async () => {
    mockFrom.mockReturnValue(mb({ id: 'm1', status: 'cancelled' }))

    const result = await cancelMembership('m1')
    expect(result.status).toBe('cancelled')
  })

  it('renewMembership calls renew_membership RPC', async () => {
    mockFrom.mockReturnValue(mb({ id: 'm1', status: 'active' }))
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await renewMembership('m1')
    expect(mockRpc).toHaveBeenCalledWith('renew_membership', { target_membership_id: 'm1' })
    expect(result).toBeDefined()
  })

  it('getUsage fetches usage history for membership', async () => {
    const usageRecords = [{ id: 'u1', amount_used: 25, usage_type: 'credit' }]
    mockFrom.mockReturnValue(mb(usageRecords))

    const result = await getUsage('m1')
    expect(result).toEqual(usageRecords)
  })

  it('planTypeLabels has correct labels', () => {
    expect(planTypeLabels).toEqual({
      subscription: 'Subscription',
      prepaid_credit: 'Prepaid Credit',
      visit_package: 'Visit Package',
      vip: 'VIP',
    })
  })

  it('getMembershipStatusColor returns correct colors', () => {
    expect(getMembershipStatusColor('active')).toContain('bg-emerald-100')
    expect(getMembershipStatusColor('expired')).toContain('bg-slate-100')
    expect(getMembershipStatusColor('frozen')).toContain('bg-blue-100')
    expect(getMembershipStatusColor('cancelled')).toContain('bg-red-100')
    expect(getMembershipStatusColor('pending_payment')).toContain('bg-amber-100')
  })
})
