import { supabase } from '@/lib/supabase'

export interface Payment {
  id: string
  business_id: string
  customer_id: string | null
  reference_type: string
  reference_id: string | null
  payment_method: string
  amount: number
  deposit_amount: number | null
  status: string
  proof_url: string | null
  transaction_id: string | null
  due_date: string | null
  notes: string | null
  verified_by: string | null
  verified_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Refund {
  id: string
  business_id: string
  payment_id: string
  amount: number
  reason: string
  status: string
  refund_method: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface Receipt {
  id: string
  business_id: string
  payment_id: string
  receipt_number: string
  receipt_data: Record<string, unknown>
  recipient_email: string | null
  sent_at: string | null
  created_at: string
}

export interface Invoice {
  id: string
  business_id: string
  customer_id: string | null
  invoice_number: string
  reference_type: string | null
  reference_id: string | null
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface PaymentSettings {
  id: string
  business_id: string
  enabled_methods: string[]
  gateway_stripe: GatewayConfig
  gateway_billplz: GatewayConfig
  gateway_toyyibpay: GatewayConfig
  gateway_senangpay: GatewayConfig
  invoice_prefix: string
  receipt_prefix: string
  next_invoice_number: number
  next_receipt_number: number
  require_proof_for: string[]
  auto_verify_online: boolean
  payment_terms_days: number
  deposit_percentage: number | null
  created_at: string
  updated_at: string
}

interface GatewayConfig {
  enabled: boolean
  [key: string]: unknown
}

const mockTransactionId = () => 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()

const mockGatewaySimulation = async (method: string, _amount: number): Promise<{ success: boolean; transaction_id: string; message: string }> => {
  await new Promise((r) => setTimeout(r, 500))
  if (method === 'cash') return { success: true, transaction_id: mockTransactionId(), message: 'Cash payment recorded' }
  if (method === 'card') return { success: true, transaction_id: mockTransactionId(), message: 'Card payment processed (mock)' }
  if (method === 'qr') return { success: true, transaction_id: mockTransactionId(), message: 'QR payment simulated' }
  if (method === 'bank_transfer') return { success: true, transaction_id: mockTransactionId(), message: 'Bank transfer reference created' }
  if (method === 'stripe') return { success: true, transaction_id: 'pi_' + mockTransactionId(), message: 'Stripe payment simulated (sandbox)' }
  if (method === 'billplz') return { success: true, transaction_id: 'bill_' + mockTransactionId(), message: 'Billplz bill created (sandbox)' }
  if (method === 'toyyibpay') return { success: true, transaction_id: 'toyyib_' + mockTransactionId(), message: 'ToyyibPay bill created (sandbox)' }
  if (method === 'senangpay') return { success: true, transaction_id: 'senang_' + mockTransactionId(), message: 'SenangPay transaction simulated (sandbox)' }
  if (method === 'credit') return { success: true, transaction_id: mockTransactionId(), message: 'Credit payment recorded' }
  if (method === 'points') return { success: true, transaction_id: mockTransactionId(), message: 'Points redemption recorded' }
  return { success: true, transaction_id: mockTransactionId(), message: 'Payment recorded' }
}

export const gatewayMocks = {
  stripe: { name: 'Stripe', enabled: false, sandbox: true },
  billplz: { name: 'Billplz', enabled: false, sandbox: true },
  toyyibpay: { name: 'ToyyibPay', enabled: false, sandbox: true },
  senangpay: { name: 'SenangPay', enabled: false, sandbox: true },
}

export async function getPayments(businessId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()
  return data
}

export async function createPayment(
  businessId: string,
  params: {
    customer_id?: string
    reference_type: string
    reference_id?: string
    payment_method: string
    amount: number
    deposit_amount?: number
    due_date?: string
    notes?: string
    proof_url?: string
  },
): Promise<string | null> {
  const isOnline = ['stripe', 'billplz', 'toyyibpay', 'senangpay', 'card', 'qr'].includes(params.payment_method)
  const isCashOrTransfer = ['cash', 'bank_transfer', 'credit', 'points'].includes(params.payment_method)

  let transactionId: string | null = null
  let status = 'pending'

  if (isOnline) {
    const result = await mockGatewaySimulation(params.payment_method, params.amount)
    transactionId = result.transaction_id
    status = result.success ? 'paid' : 'failed'
  } else if (params.payment_method === 'cash') {
    status = 'paid'
    transactionId = mockTransactionId()
  } else if (isCashOrTransfer) {
    transactionId = mockTransactionId()
    status = params.proof_url ? 'pending' : 'unpaid'
  }

  const { data } = await supabase
    .from('payments')
    .insert({
      business_id: businessId,
      customer_id: params.customer_id,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      payment_method: params.payment_method,
      amount: params.amount,
      deposit_amount: params.deposit_amount,
      due_date: params.due_date,
      notes: params.notes,
      proof_url: params.proof_url,
      transaction_id: transactionId,
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updatePayment(paymentId: string, updates: Partial<Payment>): Promise<void> {
  await supabase.from('payments').update(updates).eq('id', paymentId)
}

export async function uploadPaymentProof(paymentId: string, proofUrl: string): Promise<void> {
  await supabase
    .from('payments')
    .update({ proof_url: proofUrl, status: 'pending' })
    .eq('id', paymentId)
}

export async function verifyPayment(paymentId: string, verifiedBy: string): Promise<void> {
  await supabase.rpc('verify_payment', { p_payment_id: paymentId, p_verified_by: verifiedBy })
}

export async function processRefund(paymentId: string, amount: number, reason: string): Promise<void> {
  await supabase.rpc('process_refund', { p_payment_id: paymentId, p_amount: amount, p_reason: reason })
}

export async function getRefunds(businessId: string): Promise<Refund[]> {
  const { data } = await supabase
    .from('refunds')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function approveRefund(refundId: string, processedBy: string): Promise<void> {
  await supabase
    .from('refunds')
    .update({ status: 'approved', processed_by: processedBy, processed_at: new Date().toISOString() })
    .eq('id', refundId)
}

export async function completeRefund(refundId: string, refundMethod: string): Promise<void> {
  await supabase
    .from('refunds')
    .update({ status: 'completed', refund_method: refundMethod })
    .eq('id', refundId)
}

export async function rejectRefund(refundId: string): Promise<void> {
  await supabase
    .from('refunds')
    .update({ status: 'rejected' })
    .eq('id', refundId)
}

export async function getPendingVerifications(businessId: string): Promise<Payment[]> {
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'pending')
    .not('proof_url', 'is', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getInvoices(businessId: string): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()
  return data
}

export async function createInvoice(
  businessId: string,
  params: {
    customer_id?: string
    reference_type?: string
    reference_id?: string
    items: InvoiceItem[]
    tax?: number
    due_date?: string
    notes?: string
  },
): Promise<string | null> {
  const subtotal = params.items.reduce((s, i) => s + i.total, 0)
  const tax = params.tax ?? 0
  const total = subtotal + tax

  const { data: invNum } = await supabase.rpc('generate_invoice_number', { p_business_id: businessId })
  const invoiceNumber: string = invNum ?? 'INV-' + Date.now()

  const { data } = await supabase
    .from('invoices')
    .insert({
      business_id: businessId,
      customer_id: params.customer_id,
      invoice_number: invoiceNumber,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      items: params.items,
      subtotal,
      tax,
      total,
      due_date: params.due_date,
      notes: params.notes,
      status: 'draft',
    })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
  await supabase.from('invoices').update({ status }).eq('id', invoiceId)
}

export async function getReceipts(businessId: string): Promise<Receipt[]> {
  const { data } = await supabase
    .from('receipts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function generateReceipt(
  businessId: string,
  paymentId: string,
  receiptData: Record<string, unknown>,
  recipientEmail?: string,
): Promise<string | null> {
  const { data: rcpNum } = await supabase.rpc('generate_receipt_number', { p_business_id: businessId })
  const receiptNumber: string = rcpNum ?? 'RCP-' + Date.now()

  const { data } = await supabase
    .from('receipts')
    .insert({
      business_id: businessId,
      payment_id: paymentId,
      receipt_number: receiptNumber,
      receipt_data: receiptData,
      recipient_email: recipientEmail,
    })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function getPaymentSettings(businessId: string): Promise<PaymentSettings | null> {
  const { data } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('business_id', businessId)
    .single()
  return data
}

export async function upsertPaymentSettings(businessId: string, settings: Partial<PaymentSettings>): Promise<void> {
  await supabase
    .from('payment_settings')
    .upsert({ business_id: businessId, ...settings })
    .select()
    .single()
}
