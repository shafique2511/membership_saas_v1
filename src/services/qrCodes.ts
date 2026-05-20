import { supabase } from '@/lib/supabase'

export type QrCodeType =
  | 'business_public'
  | 'booking'
  | 'membership_signup'
  | 'loyalty_points'
  | 'customer_portal'
  | 'table_booking'
  | 'review'

export interface QrCodeAsset {
  id: string
  business_id: string
  branch_id: string | null
  qr_type: QrCodeType
  name: string
  target_url: string
  label: string | null
  description: string | null
  table_number: string | null
  style_config: Record<string, unknown>
  scan_count: number
  last_scanned_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QrTypeMeta {
  type: QrCodeType
  label: string
  description: string
  useCase: string
}

export const QR_CODE_TYPES: QrTypeMeta[] = [
  {
    type: 'business_public',
    label: 'Business public page',
    description: 'Main public page with services, contact buttons, and booking entry points.',
    useCase: 'General shop counter, front desk, or social profile QR.',
  },
  {
    type: 'booking',
    label: 'Booking page',
    description: 'Direct appointment, room, table, or event booking page.',
    useCase: 'Barber counter QR for customers to book the next appointment.',
  },
  {
    type: 'membership_signup',
    label: 'Membership signup',
    description: 'Customer registration path with membership intent.',
    useCase: 'Coffee shop table QR for joining membership.',
  },
  {
    type: 'loyalty_points',
    label: 'Loyalty points',
    description: 'Rewards and loyalty entry point for collecting or redeeming points.',
    useCase: 'Counter QR for points collection after purchase.',
  },
  {
    type: 'customer_portal',
    label: 'Customer portal',
    description: 'Member portal for memberships, rewards, bookings, and profile.',
    useCase: 'Member QR for checking membership status and booking history.',
  },
  {
    type: 'table_booking',
    label: 'Table booking',
    description: 'Booking page opened with table booking intent.',
    useCase: 'Coffee shop table QR for table, room, or event space booking.',
  },
  {
    type: 'review',
    label: 'Review page',
    description: 'Public review form for post-visit feedback.',
    useCase: 'Receipt QR for customers to leave a review.',
  },
]

export function qrTypeLabel(type: QrCodeType) {
  return QR_CODE_TYPES.find((item) => item.type === type)?.label ?? type.replaceAll('_', ' ')
}

export async function getQrCodeAssets(businessId: string): Promise<QrCodeAsset[]> {
  const { data, error } = await supabase
    .from('qr_code_assets')
    .select('*')
    .eq('business_id', businessId)
    .order('qr_type')
    .order('table_number', { nullsFirst: true })

  if (error) throw error
  return (data as QrCodeAsset[]) ?? []
}

export async function seedDefaultQrCodeAssets(businessId: string, baseUrl: string): Promise<void> {
  const { error } = await supabase.rpc('seed_default_qr_code_assets', {
    p_business_id: businessId,
    p_base_url: baseUrl,
  })
  if (error) throw error
}

export async function createTableBookingQrCode(businessId: string, tableNumber: string, targetUrl: string): Promise<void> {
  const cleanedTable = tableNumber.trim()
  const { error } = await supabase.from('qr_code_assets').insert({
    business_id: businessId,
    qr_type: 'table_booking',
    name: `Table ${cleanedTable} booking`,
    label: `Table ${cleanedTable}`,
    description: 'Table-specific booking QR for customers seated in store.',
    table_number: cleanedTable,
    target_url: targetUrl,
    is_active: true,
  })

  if (error) throw error
}

export async function setQrCodeActive(assetId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('qr_code_assets')
    .update({ is_active: isActive })
    .eq('id', assetId)

  if (error) throw error
}

export async function logQrCodeScan(assetId: string, userAgent: string): Promise<void> {
  const { error } = await supabase.rpc('log_qr_code_scan', {
    p_qr_code_id: assetId,
    p_business_id: null,
    p_qr_type: null,
    p_target_url: null,
    p_user_agent: userAgent,
  })
  if (error) throw error
}

export async function submitPublicReview(payload: {
  businessId: string
  rating: number
  staffRating?: number
  serviceRating?: number
  bookingId?: string | null
  posOrderId?: string | null
  title?: string
  comment?: string
  customerName?: string
  phone?: string
  email?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_public_review', {
    p_business_id: payload.businessId,
    p_rating: payload.rating,
    p_title: payload.title ?? null,
    p_comment: payload.comment ?? null,
    p_customer_name: payload.customerName ?? null,
    p_phone: payload.phone ?? null,
    p_email: payload.email ?? null,
    p_booking_id: payload.bookingId ?? null,
    p_pos_order_id: payload.posOrderId ?? null,
    p_staff_rating: payload.staffRating ?? null,
    p_service_rating: payload.serviceRating ?? null,
  })

  if (error) throw error
  return data as string
}
