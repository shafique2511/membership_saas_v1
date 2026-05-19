import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { downloadBlob, rowsToCsv } from '@/utils/export'

export type CsvImportType = 'customers' | 'products' | 'services' | 'memberships' | 'inventory'
export type CsvImportAction = 'insert' | 'update' | 'skip' | 'error'

export interface CsvImportTemplate {
  type: CsvImportType
  label: string
  description: string
  requiredFields: string[]
  headers: string[]
  sample: Record<string, string | number | boolean>
}

export interface CsvImportPreviewRow {
  rowNumber: number
  action: CsvImportAction
  errors: string[]
  data: Record<string, string>
  matchedId?: string
}

export interface CsvImportPreview {
  type: CsvImportType
  rows: CsvImportPreviewRow[]
  totalRows: number
  validRows: number
  errorRows: number
  insertRows: number
  updateRows: number
}

export interface CsvImportResult {
  insertedRows: number
  updatedRows: number
  skippedRows: number
  errorRows: number
}

export interface CsvImportHistoryRow {
  id: string
  business_id: string
  imported_by: string | null
  import_type: CsvImportType
  file_name: string | null
  status: string
  total_rows: number
  inserted_rows: number
  updated_rows: number
  skipped_rows: number
  error_rows: number
  summary: Record<string, unknown>
  created_at: string
}

export const csvImportTemplates: CsvImportTemplate[] = [
  {
    type: 'customers',
    label: 'Customers',
    description: 'Matches existing customers by email or phone, then updates instead of duplicating.',
    requiredFields: ['full_name'],
    headers: ['full_name', 'phone', 'email', 'birthday', 'gender', 'notes', 'points_balance'],
    sample: {
      full_name: 'Aisha Tan',
      phone: '+60123456789',
      email: 'aisha@example.com',
      birthday: '1992-04-20',
      gender: 'female',
      notes: 'Imported from old system',
      points_balance: 120,
    },
  },
  {
    type: 'products',
    label: 'Products',
    description: 'Uses SKU to update existing products when a matching SKU exists.',
    requiredFields: ['name'],
    headers: ['name', 'sku', 'category', 'cost_price', 'selling_price', 'stock_quantity', 'low_stock_threshold'],
    sample: {
      name: 'Shampoo 250ml',
      sku: 'SKU-001',
      category: 'Retail',
      cost_price: 12,
      selling_price: 28,
      stock_quantity: 20,
      low_stock_threshold: 5,
    },
  },
  {
    type: 'services',
    label: 'Services',
    description: 'Creates bookable services for this business.',
    requiredFields: ['name', 'duration_minutes'],
    headers: ['name', 'category', 'description', 'duration_minutes', 'price', 'is_bookable'],
    sample: {
      name: 'Haircut',
      category: 'Barber',
      description: 'Standard haircut',
      duration_minutes: 45,
      price: 35,
      is_bookable: true,
    },
  },
  {
    type: 'memberships',
    label: 'Memberships',
    description: 'Requires an existing customer by email or phone and an existing membership plan by name.',
    requiredFields: ['customer_email_or_phone', 'plan_name', 'start_date', 'end_date'],
    headers: ['customer_email_or_phone', 'plan_name', 'status', 'start_date', 'end_date', 'remaining_credit', 'remaining_visits', 'auto_renew'],
    sample: {
      customer_email_or_phone: 'aisha@example.com',
      plan_name: 'VIP Monthly',
      status: 'active',
      start_date: '2026-05-01',
      end_date: '2026-06-01',
      remaining_credit: 0,
      remaining_visits: 4,
      auto_renew: false,
    },
  },
  {
    type: 'inventory',
    label: 'Inventory',
    description: 'Requires an existing product SKU and records a stock transaction.',
    requiredFields: ['sku', 'transaction_type', 'quantity'],
    headers: ['sku', 'transaction_type', 'quantity', 'notes'],
    sample: {
      sku: 'SKU-001',
      transaction_type: 'stock_in',
      quantity: 10,
      notes: 'Opening balance import',
    },
  },
]

export function getCsvImportTemplate(type: CsvImportType) {
  const template = csvImportTemplates.find((item) => item.type === type)
  if (!template) throw new Error(`Unsupported import type: ${type}`)
  return template
}

export function downloadCsvTemplate(type: CsvImportType) {
  const template = getCsvImportTemplate(type)
  downloadBlob(
    new Blob([rowsToCsv([template.sample])], { type: 'text/csv;charset=utf-8;' }),
    `luxantara-${type}-import-template.csv`,
  )
}

export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (result) => resolve(result.data.filter((row) => Object.values(row).some(Boolean))),
      error: (error) => reject(error),
    })
  })
}

function requiredErrors(row: Record<string, string>, requiredFields: string[]) {
  return requiredFields
    .filter((field) => !row[field]?.trim())
    .map((field) => `Missing required field: ${field}`)
}

function parseNumber(value: string | undefined, fallback = 0) {
  if (!value?.trim()) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseIntValue(value: string | undefined, fallback = 0) {
  if (!value?.trim()) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value?.trim()) return fallback
  return ['true', 'yes', '1', 'active'].includes(value.trim().toLowerCase())
}

function normalizeStatus(value: string | undefined, allowed: string[], fallback: string) {
  const next = value?.trim().toLowerCase()
  return next && allowed.includes(next) ? next : fallback
}

async function getExistingCustomers(businessId: string) {
  const { data, error } = await supabase.from('customers').select('id,email,phone').eq('business_id', businessId)
  if (error) throw error
  return data ?? []
}

async function getExistingProducts(businessId: string) {
  const { data, error } = await supabase.from('products').select('id,sku,stock_quantity').eq('business_id', businessId)
  if (error) throw error
  return data ?? []
}

async function getExistingMembershipLookups(businessId: string) {
  const [customersResult, plansResult] = await Promise.all([
    supabase.from('customers').select('id,email,phone').eq('business_id', businessId),
    supabase.from('membership_plans').select('id,name').eq('business_id', businessId).eq('is_active', true),
  ])
  if (customersResult.error) throw customersResult.error
  if (plansResult.error) throw plansResult.error
  return {
    customers: customersResult.data ?? [],
    plans: plansResult.data ?? [],
  }
}

export async function previewCsvImport(
  businessId: string,
  type: CsvImportType,
  rows: Record<string, string>[],
): Promise<CsvImportPreview> {
  const template = getCsvImportTemplate(type)
  const previewRows: CsvImportPreviewRow[] = rows.map((row, index) => ({
    rowNumber: index + 2,
    action: 'insert',
    errors: requiredErrors(row, template.requiredFields),
    data: row,
  }))

  if (type === 'customers') {
    const existing = await getExistingCustomers(businessId)
    for (const row of previewRows) {
      const email = row.data.email?.toLowerCase()
      const phone = row.data.phone
      const match = existing.find((customer) =>
        (email && customer.email?.toLowerCase() === email) || (phone && customer.phone === phone),
      )
      if (match) {
        row.action = 'update'
        row.matchedId = match.id
      }
    }
  }

  if (type === 'products') {
    const existing = await getExistingProducts(businessId)
    for (const row of previewRows) {
      const sku = row.data.sku
      const match = sku ? existing.find((product) => product.sku === sku) : null
      if (match) {
        row.action = 'update'
        row.matchedId = match.id
      }
    }
  }

  if (type === 'memberships') {
    const lookups = await getExistingMembershipLookups(businessId)
    for (const row of previewRows) {
      const lookup = row.data.customer_email_or_phone?.toLowerCase()
      const customer = lookups.customers.find((item) => item.email?.toLowerCase() === lookup || item.phone === row.data.customer_email_or_phone)
      const plan = lookups.plans.find((item) => item.name.toLowerCase() === row.data.plan_name?.toLowerCase())
      if (!customer) row.errors.push('No matching customer found by email or phone')
      if (!plan) row.errors.push('No matching active membership plan found by name')
    }
  }

  if (type === 'inventory') {
    const products = await getExistingProducts(businessId)
    for (const row of previewRows) {
      const product = products.find((item) => item.sku === row.data.sku)
      if (!product) row.errors.push('No matching product found by SKU')
      if (!['stock_in', 'stock_out', 'adjustment', 'transfer'].includes(row.data.transaction_type)) {
        row.errors.push('transaction_type must be stock_in, stock_out, adjustment, or transfer')
      }
    }
  }

  for (const row of previewRows) {
    if (row.errors.length > 0) row.action = 'error'
  }

  return {
    type,
    rows: previewRows,
    totalRows: previewRows.length,
    validRows: previewRows.filter((row) => row.errors.length === 0).length,
    errorRows: previewRows.filter((row) => row.errors.length > 0).length,
    insertRows: previewRows.filter((row) => row.action === 'insert').length,
    updateRows: previewRows.filter((row) => row.action === 'update').length,
  }
}

export async function importCsvPreview(
  businessId: string,
  fileName: string,
  preview: CsvImportPreview,
): Promise<CsvImportResult> {
  if (preview.errorRows > 0) {
    throw new Error('Fix import errors before confirming import.')
  }

  let insertedRows = 0
  let updatedRows = 0
  const validRows = preview.rows.filter((row) => row.errors.length === 0)

  if (preview.type === 'customers') {
    for (const row of validRows) {
      const payload = {
        business_id: businessId,
        full_name: row.data.full_name,
        phone: row.data.phone || null,
        email: row.data.email || null,
        birthday: row.data.birthday || null,
        gender: row.data.gender || null,
        notes: row.data.notes || null,
        points_balance: parseIntValue(row.data.points_balance),
        status: 'active',
      }
      if (row.matchedId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', row.matchedId).eq('business_id', businessId)
        if (error) throw error
        updatedRows += 1
      } else {
        const { error } = await supabase.from('customers').insert(payload)
        if (error) throw error
        insertedRows += 1
      }
    }
  }

  if (preview.type === 'products') {
    for (const row of validRows) {
      const payload = {
        business_id: businessId,
        name: row.data.name,
        sku: row.data.sku || null,
        category: row.data.category || null,
        cost_price: parseNumber(row.data.cost_price),
        selling_price: parseNumber(row.data.selling_price),
        stock_quantity: parseIntValue(row.data.stock_quantity),
        low_stock_threshold: parseIntValue(row.data.low_stock_threshold),
        is_active: true,
      }
      if (row.matchedId) {
        const { error } = await supabase.from('products').update(payload).eq('id', row.matchedId).eq('business_id', businessId)
        if (error) throw error
        updatedRows += 1
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
        insertedRows += 1
      }
    }
  }

  if (preview.type === 'services') {
    const payload = validRows.map((row) => ({
      business_id: businessId,
      name: row.data.name,
      category: row.data.category || null,
      description: row.data.description || null,
      duration_minutes: parseIntValue(row.data.duration_minutes, 30),
      price: parseNumber(row.data.price),
      is_bookable: parseBoolean(row.data.is_bookable, true),
      is_active: true,
    }))
    if (payload.length > 0) {
      const { error } = await supabase.from('services').insert(payload)
      if (error) throw error
      insertedRows += payload.length
    }
  }

  if (preview.type === 'memberships') {
    const lookups = await getExistingMembershipLookups(businessId)
    const payload = validRows.map((row) => {
      const lookup = row.data.customer_email_or_phone?.toLowerCase()
      const customer = lookups.customers.find((item) => item.email?.toLowerCase() === lookup || item.phone === row.data.customer_email_or_phone)
      const plan = lookups.plans.find((item) => item.name.toLowerCase() === row.data.plan_name?.toLowerCase())
      return {
        business_id: businessId,
        customer_id: customer?.id,
        plan_id: plan?.id,
        status: normalizeStatus(row.data.status, ['active', 'expired', 'frozen', 'cancelled'], 'active'),
        start_date: row.data.start_date,
        end_date: row.data.end_date,
        remaining_credit: parseNumber(row.data.remaining_credit),
        remaining_visits: parseIntValue(row.data.remaining_visits),
        auto_renew: parseBoolean(row.data.auto_renew),
      }
    })
    if (payload.length > 0) {
      const { error } = await supabase.from('memberships').insert(payload)
      if (error) throw error
      insertedRows += payload.length
    }
  }

  if (preview.type === 'inventory') {
    const products = await getExistingProducts(businessId)
    for (const row of validRows) {
      const product = products.find((item) => item.sku === row.data.sku)
      if (!product) continue
      const quantity = parseIntValue(row.data.quantity)
      const { error } = await supabase.from('inventory_transactions').insert({
        business_id: businessId,
        product_id: product.id,
        transaction_type: row.data.transaction_type,
        quantity,
        notes: row.data.notes || null,
      })
      if (error) throw error

      const nextStock = row.data.transaction_type === 'stock_out'
        ? Math.max(0, Number(product.stock_quantity ?? 0) - quantity)
        : Number(product.stock_quantity ?? 0) + quantity

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: nextStock })
        .eq('id', product.id)
        .eq('business_id', businessId)
      if (updateError) throw updateError
      product.stock_quantity = nextStock
      insertedRows += 1
    }
  }

  const result = {
    insertedRows,
    updatedRows,
    skippedRows: 0,
    errorRows: preview.errorRows,
  }

  const { error } = await supabase.rpc('log_csv_import_batch', {
    p_business_id: businessId,
    p_import_type: preview.type,
    p_file_name: fileName,
    p_status: 'completed',
    p_total_rows: preview.totalRows,
    p_inserted_rows: insertedRows,
    p_updated_rows: updatedRows,
    p_skipped_rows: result.skippedRows,
    p_error_rows: result.errorRows,
    p_summary: {
      insert_rows: preview.insertRows,
      update_rows: preview.updateRows,
      validated_rows: preview.validRows,
    },
  })
  if (error) throw error

  return result
}

export async function listCsvImportHistory(businessId: string): Promise<CsvImportHistoryRow[]> {
  const { data, error } = await supabase
    .from('csv_import_batches')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as CsvImportHistoryRow[]
}
