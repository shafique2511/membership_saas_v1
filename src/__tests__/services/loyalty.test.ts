import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mb } = vi.hoisted(() => {
  function mb(data: unknown) {
    const result = { data, error: null }
    const b: any = vi.fn(() => b)
    b.select = vi.fn(() => b)
    b.eq = vi.fn(() => b)
    b.gte = vi.fn(() => b)
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => b)
    b.single = vi.fn(() => b)
    b.maybeSingle = vi.fn(() => b)
    b.insert = vi.fn(() => b)
    b.upsert = vi.fn(() => b)
    b.then = (resolve: (v: unknown) => void) => resolve(result)
    return b
  }
  const mockFrom = vi.fn(() => mb([]))
  const mockRpc = vi.fn()
  return { mockFrom, mockRpc, mb }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }), getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import { getLoyaltySettings, upsertLoyaltySettings, getRewards, createReward, getCustomerPoints, getPointsHistory, adjustPoints, rewardTypeLabels } from '@/services/loyalty'

describe('8. Loyalty points', () => {
  const businessId = 'biz-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getLoyaltySettings fetches settings', async () => {
    const settings = { business_id: businessId, earning_rate: 1.0, redemption_rate: 100 }
    mockFrom.mockReturnValue(mb(settings))

    const result = await getLoyaltySettings(businessId)
    expect(result).toEqual(settings)
  })

  it('upsertLoyaltySettings updates settings', async () => {
    mockFrom.mockReturnValue(mb(null))

    await upsertLoyaltySettings(businessId, { earning_rate: 2.0 })
    expect(mockFrom).toHaveBeenCalledWith('loyalty_settings')
  })

  it('getRewards fetches rewards catalog', async () => {
    const rewards = [{ id: 'r1', name: 'Free Hair Wash', points_required: 100, reward_type: 'free_service' }]
    mockFrom.mockReturnValue(mb(rewards))

    const result = await getRewards(businessId)
    expect(result).toEqual(rewards)
  })

  it('createReward inserts a new reward', async () => {
    mockFrom.mockReturnValue(mb(null))

    await createReward({ business_id: businessId, name: 'Free Latte', reward_type: 'free_item', points_required: 100, free_item: 'Latte' })
    expect(mockFrom).toHaveBeenCalledWith('rewards')
  })

  it('getCustomerPoints fetches customer point balances', async () => {
    const points = [{ id: 'c1', full_name: 'John', points_balance: 450, total_spent: 500 }]
    mockFrom.mockReturnValue(mb(points))

    const result = await getCustomerPoints(businessId)
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('John')
  })

  it('getPointsHistory fetches transaction history', async () => {
    const history = [{ customer_id: 'c1', points: 50, transaction_type: 'earn' }]
    mockFrom.mockReturnValue(mb(history))

    const result = await getPointsHistory(businessId, { customer_id: 'c1' })
    expect(result).toEqual(history)
  })

  it('adjustPoints calls adjust_loyalty_points RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await adjustPoints({ business_id: businessId, customer_id: 'c1', points: 50, description: 'Adjustment' })
    expect(mockRpc).toHaveBeenCalled()
  })

  it('rewardTypeLabels has correct mapping', () => {
    expect(rewardTypeLabels.voucher).toBeDefined()
    expect(rewardTypeLabels.discount).toBeDefined()
    expect(rewardTypeLabels.free_service).toBeDefined()
    expect(rewardTypeLabels.free_item).toBeDefined()
    expect(rewardTypeLabels.birthday).toBeDefined()
    expect(rewardTypeLabels.referral).toBeDefined()
  })
})
