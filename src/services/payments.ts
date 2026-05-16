import { supabase } from '@/lib/supabase'

export interface Payment {
  id: string
  business_id: string
  customer_id: string | null
  reference_type: string
  reference_id: string | null
  payment_method: string
  amount: number
  status: string
  proof_url: string | null
  transaction_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface BillingInvoice {
  id: string
  business_id: string
  subscription_id: string | null
  invoice_number: string
  amount: number
  status: string
  due_date: string | null
  paid_at: string | null
  created_at: string
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

export async function getInvoices(businessId: string): Promise<BillingInvoice[]> {
  const { data } = await supabase
    .from('billing_invoices')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}
