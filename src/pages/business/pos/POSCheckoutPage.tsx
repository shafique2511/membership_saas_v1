import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { POSTabs } from '@/pages/business/pos/POSTabs'
import {
  searchCustomers, getProducts, getServices, getMembershipPlansForPOS,
  getNextOrderNumber, createOrder, addOrderItems, recordPayments,
  recordDiscounts, recordPointsRedemption,
  completePOSOrder, updateOrderPaymentStatus, updateOrderPoints,
  getTodaySalesSummary, getDailyClosing, openDailyClosing,
  createReceipt, paymentMethodLabels,
} from '@/services/pos'
import { calculatePointsDiscount, getLoyaltySettings, type LoyaltySettings } from '@/services/loyalty'

interface CartItem {
  item_type: 'product' | 'service' | 'membership'
  item_id: string | null
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
}

function FieldLabel({
  children,
  description,
  htmlFor,
}: {
  children: string
  description: string
  htmlFor?: string
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">{children}</span>
      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{description}</span>
    </label>
  )
}

export function POSCheckoutPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [step, setStep] = useState<'items' | 'payment' | 'complete'>('items')

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<{ id: string; full_name: string; phone: string | null; points_balance: number }[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; full_name: string; phone: string | null; points_balance: number } | null>(null)
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')

  const [itemTab, setItemTab] = useState<'products' | 'services' | 'memberships'>('products')
  const [itemSearch, setItemSearch] = useState('')
  const [products, setProducts] = useState<{ id: string; name: string; selling_price: number; stock_quantity: number }[]>([])
  const [services, setServices] = useState<{ id: string; name: string; price: number }[]>([])
  const [membershipPlans, setMembershipPlans] = useState<{ id: string; name: string; price: number; plan_type: string }[]>([])

  const [cart, setCart] = useState<CartItem[]>([])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountFixed, setDiscountFixed] = useState(0)
  const [pointsRedeem, setPointsRedeem] = useState(0)
  const [pointsDiscount, setPointsDiscount] = useState(0)
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null)

  const [payments, setPayments] = useState<{ method: string; amount: string }[]>([{ method: 'cash', amount: '' }])
  const [orderResult, setOrderResult] = useState<{ order_number: string; total: number; change: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [todaySummary, setTodaySummary] = useState<Record<string, number>>({})

  const loadItems = useCallback(async () => {
    if (!businessId) return
    setProducts(await getProducts(businessId) as { id: string; name: string; selling_price: number; stock_quantity: number }[])
    setServices(await getServices(businessId) as { id: string; name: string; price: number }[])
    setMembershipPlans(await getMembershipPlansForPOS(businessId) as { id: string; name: string; price: number; plan_type: string }[])
    setTodaySummary(await getTodaySalesSummary(businessId))
    setLoyaltySettings(await getLoyaltySettings(businessId))
    const closing = await getDailyClosing(businessId)
    if (!closing || closing.status === 'closed') {
      await openDailyClosing(businessId)
    }
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void loadItems(), 0); return () => window.clearTimeout(t) }, [loadItems])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return }
    const t = window.setTimeout(async () => setCustomerResults(await searchCustomers(businessId, customerSearch)), 300)
    return () => window.clearTimeout(t)
  }, [customerSearch, businessId])

  const subtotal = cart.reduce((s, i) => s + i.total_price, 0)
  const discountAmt = discountFixed > 0 ? discountFixed : (subtotal * discountPercent / 100)
  const totalAfterDiscount = Math.max(0, subtotal - discountAmt - pointsDiscount)
  const total = totalAfterDiscount

  function addToCart(item: { item_type: CartItem['item_type']; item_id: string | null; item_name: string; unit_price: number }) {
    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === item.item_id && i.item_type === item.item_type)
      if (existing) {
        return prev.map((i) =>
          i.item_id === item.item_id && i.item_type === item.item_type
            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
            : i,
        )
      }
      return [...prev, { ...item, quantity: 1, total_price: item.unit_price }]
    })
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  function updateQty(index: number, qty: number) {
    if (qty < 1) return
    setCart((prev) => prev.map((i, idx) => idx === index ? { ...i, quantity: qty, total_price: qty * i.unit_price } : i))
  }

  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const change = totalPaid - total
  const remaining = total - totalPaid

  function addPaymentMethod() {
    const used = new Set(payments.map((p) => p.method))
    const next = ['cash', 'qr', 'card', 'bank_transfer', 'credit', 'points'].find((m) => !used.has(m))
    if (next) setPayments((prev) => [...prev, { method: next, amount: String(total - totalPaid > 0 ? total - totalPaid : 0) }])
  }

  async function handleCompleteOrder() {
    setSaving(true)
    try {
      const orderNumber = await getNextOrderNumber(businessId)
      const customerId = selectedCustomer?.id ?? null
  const customerName = selectedCustomer?.full_name ?? (walkInName || null)
  const customerPhone = selectedCustomer?.phone ?? (walkInPhone || null)

      const order = await createOrder({
        business_id: businessId,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        order_number: orderNumber,
        subtotal,
        discount_amount: discountAmt + pointsDiscount,
        total_amount: total,
      })

      await addOrderItems(order.id, cart)

      const validPayments = payments.filter((p) => Number(p.amount) > 0)
      await recordPayments(businessId, order.id, customerId, validPayments.map((p) => ({ payment_method: p.method, amount: Number(p.amount) })))

      if (discountAmt > 0) {
        await recordDiscounts(order.id, [{
          discount_type: discountFixed > 0 ? 'fixed' : 'percentage',
          discount_value: discountFixed > 0 ? discountFixed : discountPercent,
          discount_amount: discountAmt,
          description: discountFixed > 0 ? `RM ${discountFixed} off` : `${discountPercent}% off`,
        }])
      }

      if (pointsRedeem > 0) {
        await recordPointsRedemption(order.id, businessId, customerId ?? '', pointsRedeem, pointsDiscount)
      }

      const isFullyPaid = totalPaid >= total
      await updateOrderPaymentStatus(order.id, isFullyPaid ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid')

      await completePOSOrder(order.id)

      const pointsEarned = Math.floor(subtotal)
      if (pointsEarned > 0 && customerId) {
        await updateOrderPoints(order.id, pointsEarned)
        await supabase.rpc('award_loyalty_points', {
          p_business_id: businessId,
          p_customer_id: customerId,
          p_points: pointsEarned,
          p_reference_type: 'payment',
          p_reference_id: order.id,
        })
      }

      if (isFullyPaid) {
        await createReceipt({
          business_id: businessId,
          order_id: order.id,
          receipt_number: `RCP-${orderNumber}`,
          receipt_data: {
            order_number: orderNumber,
            items: cart,
            subtotal,
            discount: discountAmt + pointsDiscount,
            total,
            payments: validPayments,
            customer: customerName,
            date: new Date().toISOString(),
          },
        })
      }

      setOrderResult({ order_number: orderNumber, total, change: isFullyPaid ? change : 0 })
      setStep('complete')
    } catch (e) {
      console.error(e)
      alert('Failed to complete order')
    } finally {
      setSaving(false)
    }
  }

  function resetOrder() {
    setCart([])
    setSelectedCustomer(null)
    setWalkInName('')
    setWalkInPhone('')
    setCustomerSearch('')
    setDiscountPercent(0)
    setDiscountFixed(0)
    setPointsRedeem(0)
    setPointsDiscount(0)
    setPayments([{ method: 'cash', amount: '' }])
    setOrderResult(null)
    setStep('items')
    loadItems()
  }

  if (step === 'complete' && orderResult) {
    return (
      <div className="space-y-6">
        <POSTabs />
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <CardTitle>Order complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-2xl font-bold">#{orderResult.order_number}</p>
            <p className="text-3xl font-bold text-teal-700">RM {orderResult.total.toFixed(2)}</p>
            {orderResult.change > 0 && <p className="text-green-600">Change: RM {orderResult.change.toFixed(2)}</p>}
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={() => window.print()}>Print receipt</Button>
              <Button className="flex-1" variant="outline" onClick={resetOrder}>New order</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredProducts = products.filter((p) => !itemSearch || p.name.toLowerCase().includes(itemSearch.toLowerCase()))
  const filteredServices = services.filter((s) => !itemSearch || s.name.toLowerCase().includes(itemSearch.toLowerCase()))
  const filteredPlans = membershipPlans.filter((p) => !itemSearch || p.name.toLowerCase().includes(itemSearch.toLowerCase()))

  return (
    <div className="space-y-4">
      <POSTabs />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-md border border-slate-200 p-2 dark:border-slate-700">
                  <div>
                    <span className="font-medium">{selectedCustomer.full_name}</span>
                    {selectedCustomer.phone && <span className="ml-2 text-xs text-slate-400">{selectedCustomer.phone}</span>}
                    <span className="ml-2 text-xs text-teal-600">{selectedCustomer.points_balance} pts</span>
                  </div>
                  <button type="button" className="text-xs text-slate-400" onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}>Change</button>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <FieldLabel htmlFor="pos-customer-search" description="Find an existing customer to use memberships, loyalty points, and saved details.">
                      Existing customer
                    </FieldLabel>
                    <Input id="pos-customer-search" className="mt-1" placeholder="Search by name or phone" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                    {customerResults.length > 0 && (
                      <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                        {customerResults.map((c) => (
                          <button key={c.id} type="button" onClick={() => setSelectedCustomer(c)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span>{c.full_name}</span>
                            <span className="text-xs text-teal-600">{c.points_balance} pts</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:w-72">
                    <div>
                      <FieldLabel htmlFor="pos-walkin-name" description="Use this when the customer is not registered.">
                        Walk-in name
                      </FieldLabel>
                      <Input id="pos-walkin-name" className="mt-1" placeholder="Optional name" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="pos-walkin-phone" description="Optional contact number for receipt lookup.">
                        Walk-in phone
                      </FieldLabel>
                      <Input id="pos-walkin-phone" className="mt-1" placeholder="Phone number" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Item type</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Choose what you want to add to the cart.</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(['products', 'services', 'memberships'] as const).map((tab) => (
                      <button key={tab} onClick={() => setItemTab(tab)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${itemTab === tab ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                      >{tab === 'memberships' ? 'Memberships' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor="pos-item-search" description="Filter the list below by item name.">
                    Search items
                  </FieldLabel>
                  <Input id="pos-item-search" className="mt-1" placeholder="Product, service, or plan" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                </div>
              </div>

              <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                {itemTab === 'products' && filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => addToCart({ item_type: 'product', item_id: p.id, item_name: p.name, unit_price: Number(p.selling_price) })}
                    className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <div><span className="font-medium">{p.name}</span><span className="ml-2 text-xs text-slate-400">Stock: {p.stock_quantity}</span></div>
                    <span className="font-medium text-teal-700">RM {Number(p.selling_price).toFixed(2)}</span>
                  </button>
                ))}
                {itemTab === 'services' && filteredServices.map((s) => (
                  <button key={s.id} onClick={() => addToCart({ item_type: 'service', item_id: s.id, item_name: s.name, unit_price: Number(s.price) })}
                    className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-medium text-teal-700">RM {Number(s.price).toFixed(2)}</span>
                  </button>
                ))}
                {itemTab === 'memberships' && filteredPlans.map((p) => (
                  <button key={p.id} onClick={() => addToCart({ item_type: 'membership', item_id: p.id, item_name: `${p.name} (${p.plan_type})`, unit_price: Number(p.price) })}
                    className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <div><span className="font-medium">{p.name}</span><span className="ml-2 text-xs text-slate-400">{p.plan_type}</span></div>
                    <span className="font-medium text-teal-700">RM {Number(p.price).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Cart ({cart.length} items)</CardTitle></CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No items added yet.</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-md border border-slate-100 p-2 text-sm dark:border-slate-800">
                      <div className="flex-1"><span className="font-medium">{item.item_name}</span><span className="ml-2 text-xs text-slate-400">{item.item_type}</span></div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(idx, item.quantity - 1)} className="h-6 w-6 rounded bg-slate-100 text-xs dark:bg-slate-800">-</button>
                        <span className="w-6 text-center text-xs">{item.quantity}</span>
                        <button onClick={() => updateQty(idx, item.quantity + 1)} className="h-6 w-6 rounded bg-slate-100 text-xs dark:bg-slate-800">+</button>
                      </div>
                      <span className="w-20 text-right font-medium">RM {item.total_price.toFixed(2)}</span>
                      <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>RM {subtotal.toFixed(2)}</span></div>
              {discountAmt > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-RM {discountAmt.toFixed(2)}</span></div>}
              {pointsDiscount > 0 && <div className="flex justify-between text-blue-600"><span>Points ({pointsRedeem})</span><span>-RM {pointsDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>RM {total.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs text-slate-400"><span>Today's sales</span><span>RM {Number(todaySummary.totalSales ?? 0).toFixed(2)} ({todaySummary.totalOrders ?? 0} orders)</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Discount</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="pos-discount-percent" description="Percentage discount for the whole cart. Clears fixed discount.">
                    Percent off
                  </FieldLabel>
                  <Input id="pos-discount-percent" className="mt-1" type="number" placeholder="Example: 10" value={discountPercent || ''} onChange={(e) => { setDiscountPercent(Number(e.target.value)); setDiscountFixed(0) }} />
                </div>
                <div>
                  <FieldLabel htmlFor="pos-discount-fixed" description="Fixed RM discount for the whole cart. Clears percent discount.">
                    Fixed amount off
                  </FieldLabel>
                  <Input id="pos-discount-fixed" className="mt-1" type="number" placeholder="Example: 5" value={discountFixed || ''} onChange={(e) => { setDiscountFixed(Number(e.target.value)); setDiscountPercent(0) }} />
                </div>
              </div>
              {selectedCustomer && selectedCustomer.points_balance > 0 && (
                <div className="rounded-md bg-blue-50 p-2 text-xs dark:bg-blue-900/30">
                  <p className="mb-1 font-medium text-blue-700 dark:text-blue-300">Redeem points</p>
                  <p className="text-blue-600">Balance: {selectedCustomer.points_balance} pts</p>
                  <div className="mt-1 flex gap-2">
                    <div className="flex-1">
                      <FieldLabel htmlFor="pos-points-redeem" description={`${loyaltySettings?.redemption_rate ?? 100} points gives RM ${Number(loyaltySettings?.redemption_discount_amount ?? 5).toFixed(2)} discount.`}>
                        Points to redeem
                      </FieldLabel>
                      <Input id="pos-points-redeem" className="mt-1" type="number" placeholder="Example: 100" value={pointsRedeem || ''} onChange={(e) => {
                        const requested = Number(e.target.value)
                        const pts = Math.min(Math.max(0, requested), selectedCustomer.points_balance)
                        setPointsRedeem(pts)
                        setPointsDiscount(calculatePointsDiscount(pts, loyaltySettings))
                      }} />
                    </div>
                    <span className="self-center text-xs">=RM {pointsDiscount}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {payments.map((p, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
                  <div>
                    <FieldLabel htmlFor={`pos-payment-method-${idx}`} description="How the customer pays.">
                      Method
                    </FieldLabel>
                    <select id={`pos-payment-method-${idx}`} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={p.method} onChange={(e) => {
                      const newPayments = [...payments]
                      newPayments[idx] = { ...newPayments[idx], method: e.target.value }
                      setPayments(newPayments)
                    }}>
                      {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k} disabled={payments.some((pp) => pp.method === k && pp !== p)}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`pos-payment-amount-${idx}`} description="Amount collected with this payment method.">
                      Amount
                    </FieldLabel>
                    <Input id={`pos-payment-amount-${idx}`} className="mt-1" type="number" placeholder="Amount paid" value={p.amount} onChange={(e) => {
                      const newPayments = [...payments]
                      newPayments[idx] = { ...newPayments[idx], amount: e.target.value }
                      setPayments(newPayments)
                    }} />
                  </div>
                  {payments.length > 1 && (
                    <button onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))} className="self-end pb-3 text-red-500" aria-label="Remove payment method">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
              <div className="flex justify-between text-xs"><span>Total paid</span><span className="font-medium">RM {totalPaid.toFixed(2)}</span></div>
              {remaining > 0 && <div className="flex justify-between text-xs text-amber-600"><span>Remaining</span><span>RM {remaining.toFixed(2)}</span></div>}
              {totalPaid >= total && totalPaid > 0 && <div className="flex justify-between text-xs text-green-600"><span>Change</span><span>RM {(totalPaid - total).toFixed(2)}</span></div>}
              {payments.length < 6 && totalPaid < total && (
                <Button size="sm" variant="outline" className="w-full" onClick={addPaymentMethod}>+ Split payment</Button>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full py-6 text-lg"
            disabled={cart.length === 0 || total <= 0 || saving || (totalPaid < total && totalPaid > 0)}
            onClick={handleCompleteOrder}
          >
            {saving ? 'Processing...' : remaining <= 0 ? `Complete - RM ${total.toFixed(2)}` : `Collect RM ${remaining.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
