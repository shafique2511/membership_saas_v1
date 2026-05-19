import { supabase } from '@/lib/supabase'

export interface Product {
  id: string
  business_id: string
  branch_id: string | null
  name: string
  category: string | null
  sku: string | null
  barcode: string | null
  description: string | null
  unit: string
  cost_price: number
  selling_price: number
  stock_quantity: number
  low_stock_threshold: number
  min_stock_level: number
  max_stock_level: number | null
  supplier_id: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryTransaction {
  id: string
  business_id: string
  branch_id: string | null
  product_id: string
  transaction_type: 'stock_in' | 'stock_out' | 'adjustment' | 'transfer' | 'sale'
  quantity: number
  notes: string | null
  from_branch_id: string | null
  to_branch_id: string | null
  reference_type: string | null
  reference_id: string | null
  unit_cost: number | null
  created_by: string | null
  created_at: string
}

export interface Supplier {
  id: string
  business_id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  created_at: string
}

export async function getProducts(businessId: string, filters?: { category?: string; search?: string; branch_id?: string }) {
  let q = supabase
    .from('products')
    .select('*, suppliers(name)')
    .eq('business_id', businessId)
    .order('name')

  if (filters?.category) q = q.eq('category', filters.category)
  if (filters?.branch_id) q = q.eq('branch_id', filters.branch_id)
  if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)

  const { data } = await q
  return data ?? []
}

export async function getProduct(productId: string) {
  const { data } = await supabase
    .from('products')
    .select('*, suppliers(name)')
    .eq('id', productId)
    .single()
  return data
}

export async function createProduct(data: Partial<Product>) {
  const { error } = await supabase.from('products').insert(data)
  if (error) throw error
}

export async function updateProduct(id: string, data: Partial<Product>) {
  const { error } = await supabase.from('products').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string) {
  await supabase.from('products').update({ is_active: false }).eq('id', id)
}

export async function getCategories(businessId: string): Promise<string[]> {
  const { data } = await supabase
    .from('products')
    .select('category')
    .eq('business_id', businessId)
    .not('category', 'is', null)
    .order('category')
  return [...new Set(data?.map((r) => r.category as string).filter(Boolean) ?? [])]
}

export async function getSuppliers(businessId: string) {
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .eq('business_id', businessId)
    .order('name')
  return data ?? []
}

export async function createSupplier(data: Partial<Supplier>) {
  const { error } = await supabase.from('suppliers').insert(data)
  if (error) throw error
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
  const { error } = await supabase.from('suppliers').update(data).eq('id', id)
  if (error) throw error
}

export async function deactivateSupplier(id: string) {
  const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

export async function getInventoryTransactions(businessId: string, filters?: {
  product_id?: string; transaction_type?: string; branch_id?: string;
  date_from?: string; date_to?: string; limit?: number
}) {
  let q = supabase
    .from('inventory_transactions')
    .select('*, products(name, sku), from_branch:from_branch_id(name), to_branch:to_branch_id(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (filters?.product_id) q = q.eq('product_id', filters.product_id)
  if (filters?.transaction_type) q = q.eq('transaction_type', filters.transaction_type)
  if (filters?.branch_id) q = q.eq('branch_id', filters.branch_id)
  if (filters?.date_from) q = q.gte('created_at', filters.date_from)
  if (filters?.date_to) q = q.lte('created_at', filters.date_to + 'T23:59:59')

  const { data } = await q
  return data ?? []
}

export async function recordStockMovement(data: {
  business_id: string; product_id: string; quantity: number;
  transaction_type: string; notes?: string; branch_id?: string;
  unit_cost?: number; reference_type?: string; reference_id?: string
}) {
  const { error } = await supabase.rpc('record_stock_movement', {
    p_business_id: data.business_id,
    p_product_id: data.product_id,
    p_quantity: data.quantity,
    p_transaction_type: data.transaction_type,
    p_notes: data.notes ?? null,
    p_branch_id: data.branch_id ?? null,
    p_unit_cost: data.unit_cost ?? null,
    p_reference_type: data.reference_type ?? null,
    p_reference_id: data.reference_id ?? null,
  })
  if (error) throw error
}

export async function transferStock(data: {
  business_id: string; product_id: string; quantity: number;
  from_branch_id: string; to_branch_id: string; notes?: string
}) {
  const { error } = await supabase.rpc('transfer_stock', {
    p_business_id: data.business_id,
    p_product_id: data.product_id,
    p_quantity: data.quantity,
    p_from_branch_id: data.from_branch_id,
    p_to_branch_id: data.to_branch_id,
    p_notes: data.notes ?? null,
  })
  if (error) throw error
}

export async function getLowStockProducts(businessId: string, branchId?: string) {
  let q = supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true })

  if (branchId) q = q.eq('branch_id', branchId)

  const { data } = await q
  return (data ?? []).filter((p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold)) as Product[]
}

export async function getInventoryReport(businessId: string) {
  const products = await getProducts(businessId) as Product[]
  const totalProducts = products.length
  const totalValue = products.reduce((s, p) => s + Number(p.cost_price) * Number(p.stock_quantity), 0)
  const totalRetailValue = products.reduce((s, p) => s + Number(p.selling_price) * Number(p.stock_quantity), 0)
  const lowStockCount = products.filter((p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold)).length
  const outOfStockCount = products.filter((p) => Number(p.stock_quantity) === 0).length
  const totalStockQty = products.reduce((s, p) => s + Number(p.stock_quantity), 0)

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[]
  const categoryBreakdown = categories.map((cat) => {
    const catProducts = products.filter((p) => p.category === cat)
    return {
      category: cat,
      count: catProducts.length,
      stockQty: catProducts.reduce((s, p) => s + Number(p.stock_quantity), 0),
      value: catProducts.reduce((s, p) => s + Number(p.cost_price) * Number(p.stock_quantity), 0),
    }
  })

  return { totalProducts, totalValue, totalRetailValue, lowStockCount, outOfStockCount, totalStockQty, categoryBreakdown }
}
