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
  return { mockFrom: vi.fn(() => mb([])), mockRpc: vi.fn(), mb }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }), getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import { createOrder, completePOSOrder, refundOrder, getOrders, getOrder, getNextOrderNumber } from '@/services/pos'
import { recordStockMovement, getProducts, getLowStockProducts, transferStock, getInventoryReport } from '@/services/inventory'
import { createPayment, getPayments, verifyPayment, processRefund, updatePayment } from '@/services/payments'

describe('9. POS checkout', () => {
  const businessId = 'biz-1'

  beforeEach(() => { vi.clearAllMocks() })

  it('createOrder creates a new POS order', async () => {
    const newOrder = { id: 'po-1', order_number: 'POS-001', total_amount: 60, status: 'open' }
    mockFrom.mockReturnValue(mb(newOrder))

    const result = await createOrder({ business_id: businessId, order_number: 'POS-001', subtotal: 60, total_amount: 60 })
    expect(result).toEqual(newOrder)
  })

  it('getNextOrderNumber generates order number', async () => {
    mockFrom.mockReturnValue(mb([]))

    const result = await getNextOrderNumber(businessId)
    expect(result).toMatch(/^POS-\d{6}$/)
  })

  it('completePOSOrder calls RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await completePOSOrder('po-1')
    expect(mockRpc).toHaveBeenCalledWith('complete_pos_order', { p_order_id: 'po-1' })
  })

  it('refundOrder calls RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await refundOrder('po-1', 'Customer returned item')
    expect(mockRpc).toHaveBeenCalled()
  })

  it('getOrders fetches with filters', async () => {
    const orders = [{ id: 'po-1', order_number: 'POS-001' }]
    mockFrom.mockReturnValue(mb(orders))

    const result = await getOrders(businessId, { status: 'completed' })
    expect(result).toEqual(orders)
  })

  it('getOrder fetches single order', async () => {
    const order = { id: 'po-1', order_number: 'POS-001' }
    mockFrom.mockReturnValue(mb(order))

    const result = await getOrder('po-1')
    expect(result).toEqual(order)
  })
})

describe('10. Inventory stock deduction', () => {
  const businessId = 'biz-1'

  beforeEach(() => { vi.clearAllMocks() })

  it('recordStockMovement calls RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await recordStockMovement({ business_id: businessId, product_id: 'pr-1', quantity: -2, transaction_type: 'sale' })
    expect(mockRpc).toHaveBeenCalledWith('record_stock_movement', expect.objectContaining({ p_product_id: 'pr-1' }))
  })

  it('getProducts fetches all products', async () => {
    const products = [{ id: 'pr-1', name: 'Pomade', stock_quantity: 30 }]
    mockFrom.mockReturnValue(mb(products))

    const result = await getProducts(businessId)
    expect(result).toEqual(products)
  })

  it('getLowStockProducts returns products below threshold', async () => {
    const products = [{ id: 'pr-1', name: 'Pomade', stock_quantity: 3, low_stock_threshold: 5 }]
    mockFrom.mockReturnValue(mb(products))

    const result = await getLowStockProducts(businessId)
    expect(result).toHaveLength(1)
  })

  it('transferStock calls RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await transferStock({ business_id: businessId, product_id: 'pr-1', quantity: 5, from_branch_id: 'b1', to_branch_id: 'b2' })
    expect(mockRpc).toHaveBeenCalledWith('transfer_stock', expect.objectContaining({ p_product_id: 'pr-1' }))
  })

  it('getInventoryReport returns aggregated data', async () => {
    mockFrom.mockReturnValue(mb([
      { id: 'p1', name: 'Product 1', cost_price: 10, selling_price: 25, stock_quantity: 10, low_stock_threshold: 5, category: 'Cat1' },
      { id: 'p2', name: 'Product 2', cost_price: 20, selling_price: 50, stock_quantity: 5, low_stock_threshold: 3, category: 'Cat1' },
      { id: 'p3', name: 'Product 3', cost_price: 5, selling_price: 15, stock_quantity: 0, low_stock_threshold: 10, category: 'Cat2' },
      { id: 'p4', name: 'Product 4', cost_price: 8, selling_price: 20, stock_quantity: 3, low_stock_threshold: 2, category: 'Cat2' },
    ]))

    const result = await getInventoryReport(businessId)
    expect(result.totalProducts).toBe(4)
  })
})

describe('11. Payment recording', () => {
  const businessId = 'biz-1'

  beforeEach(() => { vi.clearAllMocks() })

  it('createPayment creates payment', async () => {
    mockFrom.mockReturnValue(mb({ id: 'pm-1' }))

    const result = await createPayment(businessId, { payment_method: 'cash', amount: 25, reference_type: 'booking', reference_id: 'bk-1' })
    expect(result).toBe('pm-1')
  })

  it('getPayments fetches payments', async () => {
    const payments = [{ id: 'pm-1', amount: 25, status: 'paid' }]
    mockFrom.mockReturnValue(mb(payments))

    const result = await getPayments(businessId)
    expect(result).toEqual(payments)
  })

  it('verifyPayment calls RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await verifyPayment('pm-1', 'u1')
    expect(mockRpc).toHaveBeenCalledWith('verify_payment', { p_payment_id: 'pm-1', p_verified_by: 'u1' })
  })

  it('processRefund calls RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await processRefund('pm-1', 25, 'Refund reason')
    expect(mockRpc).toHaveBeenCalledWith('process_refund', expect.any(Object))
  })

  it('updatePayment updates fields', async () => {
    mockFrom.mockReturnValue(mb(null))

    await updatePayment('pm-1', { status: 'paid', paid_at: new Date().toISOString() })
    expect(mockFrom).toHaveBeenCalledWith('payments')
  })
})
