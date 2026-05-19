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
  external_reference: string | null
  gateway_provider: string | null
  gateway_status: string | null
  gateway_response: Record<string, unknown> | null
  refunded_amount: number
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

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'qr', 'card', 'stripe', 'billplz', 'toyyibpay', 'senangpay'] as const
export const PAYMENT_REFERENCE_TYPES = ['booking', 'membership', 'pos_order', 'subscription', 'manual'] as const

const mockTransactionId = () => 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()

export const mockGatewaySimulation = async (method: string, _amount: number): Promise<{ success: boolean; transaction_id: string; message: string; provider: string; status: string }> => {
  await new Promise((r) => setTimeout(r, 500))
  if (method === 'cash') return { success: true, transaction_id: mockTransactionId(), message: 'Cash payment recorded', provider: 'manual', status: 'recorded' }
  if (method === 'card') return { success: true, transaction_id: mockTransactionId(), message: 'Card payment recorded (mock)', provider: 'manual_card', status: 'succeeded' }
  if (method === 'qr') return { success: true, transaction_id: mockTransactionId(), message: 'QR payment simulated', provider: 'manual_qr', status: 'succeeded' }
  if (method === 'bank_transfer') return { success: true, transaction_id: mockTransactionId(), message: 'Bank transfer reference created', provider: 'manual_bank_transfer', status: 'pending_verification' }
  if (method === 'stripe') return { success: true, transaction_id: 'pi_' + mockTransactionId(), message: 'Stripe payment simulated (sandbox)', provider: 'stripe', status: 'succeeded' }
  if (method === 'billplz') return { success: true, transaction_id: 'bill_' + mockTransactionId(), message: 'Billplz bill created (sandbox)', provider: 'billplz', status: 'succeeded' }
  if (method === 'toyyibpay') return { success: true, transaction_id: 'toyyib_' + mockTransactionId(), message: 'ToyyibPay bill created (sandbox)', provider: 'toyyibpay', status: 'succeeded' }
  if (method === 'senangpay') return { success: true, transaction_id: 'senang_' + mockTransactionId(), message: 'SenangPay transaction simulated (sandbox)', provider: 'senangpay', status: 'succeeded' }
  return { success: true, transaction_id: mockTransactionId(), message: 'Payment recorded', provider: 'manual', status: 'recorded' }
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
  const isManualPending = ['bank_transfer'].includes(params.payment_method)

  let transactionId: string | null = null
  let gatewayProvider: string | null = null
  let gatewayStatus: string | null = null
  let gatewayResponse: Record<string, unknown> | null = null
  let status = 'pending'

  if (isOnline) {
    const result = await mockGatewaySimulation(params.payment_method, params.amount)
    transactionId = result.transaction_id
    gatewayProvider = result.provider
    gatewayStatus = result.status
    gatewayResponse = result
    status = result.success ? 'paid' : 'failed'
  } else if (params.payment_method === 'cash') {
    status = 'paid'
    transactionId = mockTransactionId()
    gatewayProvider = 'manual'
    gatewayStatus = 'recorded'
  } else if (isManualPending) {
    const result = await mockGatewaySimulation(params.payment_method, params.amount)
    transactionId = result.transaction_id
    gatewayProvider = result.provider
    gatewayStatus = result.status
    gatewayResponse = result
    status = params.proof_url ? 'pending' : 'unpaid'
  }

  const { data, error } = await supabase.rpc('record_payment', {
    p_business_id: businessId,
    p_customer_id: params.customer_id ?? null,
    p_reference_type: params.reference_type,
    p_reference_id: params.reference_id ?? null,
    p_payment_method: params.payment_method,
    p_amount: params.amount,
    p_deposit_amount: params.deposit_amount ?? null,
    p_due_date: params.due_date ?? null,
    p_notes: params.notes ?? null,
    p_proof_url: params.proof_url ?? null,
    p_transaction_id: transactionId,
    p_status: status,
    p_gateway_provider: gatewayProvider,
    p_gateway_status: gatewayStatus,
    p_gateway_response: gatewayResponse,
  })
  if (error) throw error
  return data as string | null
}

export async function updatePayment(paymentId: string, updates: Partial<Payment>): Promise<void> {
  const { error } = await supabase.from('payments').update(updates).eq('id', paymentId)
  if (error) throw error
}

export async function uploadPaymentProof(paymentId: string, proofUrl: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ proof_url: proofUrl, status: 'pending' })
    .eq('id', paymentId)
  if (error) throw error
}

export async function uploadPaymentProofFile(businessId: string, paymentId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() || 'proof'
  const path = `${businessId}/${paymentId}/${Date.now()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
  const proofUrl = data.publicUrl
  await uploadPaymentProof(paymentId, proofUrl)
  return proofUrl
}

export async function verifyPayment(paymentId: string, verifiedBy: string): Promise<void> {
  const { error } = await supabase.rpc('verify_payment', { p_payment_id: paymentId, p_verified_by: verifiedBy })
  if (error) throw error
}

export async function processRefund(paymentId: string, amount: number, reason: string): Promise<void> {
  const { error } = await supabase.rpc('process_refund', { p_payment_id: paymentId, p_amount: amount, p_reason: reason })
  if (error) throw error
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
  const { error } = await supabase
    .from('refunds')
    .update({ status: 'approved', processed_by: processedBy, processed_at: new Date().toISOString() })
    .eq('id', refundId)
  if (error) throw error
}

export async function completeRefund(refundId: string, refundMethod: string): Promise<void> {
  const { error } = await supabase
    .from('refunds')
    .update({ status: 'completed', refund_method: refundMethod })
    .eq('id', refundId)
  if (error) throw error
}

export async function rejectRefund(refundId: string): Promise<void> {
  const { error } = await supabase
    .from('refunds')
    .update({ status: 'rejected' })
    .eq('id', refundId)
  if (error) throw error
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
