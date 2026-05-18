import { supabase } from '@/lib/supabase'
import type { BusinessType, ModuleKey } from '@/types'

export interface SetupServiceInput {
  name: string
  category?: string
  duration_minutes: number
  price: number
  is_bookable?: boolean
}

export interface SetupProductInput {
  name: string
  category?: string
  selling_price: number
  stock_quantity?: number
}

export interface SetupStaffInput {
  full_name: string
  role: string
  email?: string
  phone?: string
}

export interface BusinessSetupInput {
  businessId: string
  businessType: BusinessType
  profile: {
    name: string
    logo_url?: string
    phone?: string
    whatsapp?: string
    email?: string
    address?: string
    timezone: string
  }
  branch: {
    name: string
    address?: string
    opening_hours: Record<string, unknown>
    closing_days: string[]
  }
  services: SetupServiceInput[]
  products: SetupProductInput[]
  staff: SetupStaffInput[]
  modules: ModuleKey[]
}

export const businessTypeOptions: { value: BusinessType; label: string }[] = [
  { value: 'barber_shop', label: 'Barber' },
  { value: 'coffee_shop', label: 'Coffee shop' },
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'event_space', label: 'Event space' },
  { value: 'custom', label: 'Custom' },
]

export const setupModuleOptions: { value: ModuleKey; label: string }[] = [
  { value: 'booking', label: 'Booking' },
  { value: 'membership', label: 'Membership' },
  { value: 'pos', label: 'POS' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'loyalty', label: 'Loyalty' },
  { value: 'reports', label: 'Reports' },
]

export function presetForBusinessType(type: BusinessType) {
  if (type === 'barber_shop') {
    return {
      services: [
        { name: 'Haircut', category: 'Barber', duration_minutes: 30, price: 25 },
        { name: 'Haircut + Beard', category: 'Barber', duration_minutes: 45, price: 40 },
        { name: 'Kids Haircut', category: 'Barber', duration_minutes: 25, price: 18 },
        { name: 'Hair Wash', category: 'Barber', duration_minutes: 15, price: 12 },
      ],
      products: [],
      modules: ['booking', 'membership', 'loyalty', 'reports'] as ModuleKey[],
    }
  }

  if (type === 'coffee_shop') {
    return {
      services: [
        { name: 'Table booking', category: 'Booking', duration_minutes: 60, price: 0 },
        { name: 'Room booking', category: 'Booking', duration_minutes: 120, price: 80 },
        { name: 'Event space', category: 'Booking', duration_minutes: 240, price: 300 },
      ],
      products: [
        { name: 'Coffee', category: 'Drinks', selling_price: 8, stock_quantity: 0 },
        { name: 'Breakfast set', category: 'Food', selling_price: 18, stock_quantity: 0 },
      ],
      modules: ['booking', 'pos', 'inventory', 'loyalty', 'reports'] as ModuleKey[],
    }
  }

  return {
    services: [],
    products: [],
    modules: ['booking', 'reports'] as ModuleKey[],
  }
}

export function defaultOpeningHours() {
  return {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '10:00', close: '16:00' },
  }
}

export async function completeBusinessSetup(input: BusinessSetupInput) {
  await supabase.rpc('set_business_onboarding_modules', {
    target_business_id: input.businessId,
    target_module_keys: ['core', 'customer_portal', 'payment', ...input.modules],
  })

  const { error: businessError } = await supabase
    .from('businesses')
    .update({
      name: input.profile.name,
      business_type: input.businessType,
      logo_url: input.profile.logo_url || null,
      phone: input.profile.phone || null,
      whatsapp: input.profile.whatsapp || null,
      email: input.profile.email || null,
      address: input.profile.address || null,
      timezone: input.profile.timezone,
      setup_step: 'profile',
    })
    .eq('id', input.businessId)

  if (businessError) throw businessError

  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .insert({
      business_id: input.businessId,
      name: input.branch.name,
      address: input.branch.address || input.profile.address || null,
      opening_hours: {
        ...input.branch.opening_hours,
        closing_days: input.branch.closing_days,
      },
      is_main: true,
    })
    .select('id')
    .single()

  if (branchError) throw branchError

  const branchId = branch.id as string

  const insertedServices: { id: string }[] = []
  for (const service of input.services.filter((item) => item.name.trim())) {
    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: input.businessId,
        branch_id: branchId,
        name: service.name.trim(),
        category: service.category || null,
        duration_minutes: service.duration_minutes,
        price: service.price,
        is_bookable: service.is_bookable ?? true,
      })
      .select('id')
      .single()

    if (error) throw error
    insertedServices.push(data as { id: string })
  }

  if (input.modules.includes('inventory')) {
    for (const product of input.products.filter((item) => item.name.trim())) {
      const { error } = await supabase.from('products').insert({
        business_id: input.businessId,
        branch_id: branchId,
        name: product.name.trim(),
        category: product.category || null,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity ?? 0,
        low_stock_threshold: 0,
      })

      if (error) throw error
    }
  }

  for (const staff of input.staff.filter((item) => item.full_name.trim())) {
    const { data, error } = await supabase
      .from('staff')
      .insert({
        business_id: input.businessId,
        branch_id: branchId,
        full_name: staff.full_name.trim(),
        role: staff.role || 'staff',
        email: staff.email || null,
        phone: staff.phone || null,
        working_hours: input.branch.opening_hours,
        off_days: input.branch.closing_days,
      })
      .select('id')
      .single()

    if (error) throw error

    for (const service of insertedServices) {
      await supabase.from('staff_services').upsert({
        staff_id: data.id,
        service_id: service.id,
        commission_type: 'percentage',
        commission_value: 0,
      }, { onConflict: 'staff_id,service_id' })
    }
  }

  await supabase.rpc('mark_business_setup_complete', {
    target_business_id: input.businessId,
    target_setup_metadata: {
      business_type: input.businessType,
      modules: input.modules,
      service_count: input.services.length,
      product_count: input.products.length,
      staff_count: input.staff.length,
    },
  })
}
