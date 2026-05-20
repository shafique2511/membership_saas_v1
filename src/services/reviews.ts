import { supabase } from '@/lib/supabase'
import { sendNotificationWithResult, renderTemplate, getTemplate, type SendNotificationResult } from '@/services/notifications'
import type { BookingRow } from '@/services/bookings'
import type { POSOrder } from '@/services/pos'

export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'flagged'

export interface ReviewRow {
  id: string
  business_id: string
  branch_id: string | null
  customer_id: string | null
  booking_id: string | null
  pos_order_id: string | null
  staff_id: string | null
  service_id: string | null
  rating: number
  staff_rating: number | null
  service_rating: number | null
  title: string | null
  comment: string | null
  source: string
  status: ReviewStatus
  created_at: string
  customers?: { full_name: string; phone: string | null; email: string | null } | { full_name: string; phone: string | null; email: string | null }[] | null
  staff?: { full_name: string } | { full_name: string }[] | null
  services?: { name: string } | { name: string }[] | null
  bookings?: { booking_date: string; start_time: string | null } | { booking_date: string; start_time: string | null }[] | null
  pos_orders?: { order_number: string; created_at: string } | { order_number: string; created_at: string }[] | null
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  publishedReviews: number
  hiddenReviews: number
  bestStaff: { name: string; average: number; count: number } | null
  lowRatedService: { name: string; average: number; count: number } | null
  trends: { date: string; average: number; count: number }[]
}

export interface ReviewContext {
  source: 'booking' | 'pos_order'
  booking_id: string | null
  pos_order_id: string | null
  customer_id: string | null
  staff_id: string | null
  service_id: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  service_name: string | null
  staff_name: string | null
}

function single<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function groupAverage<T extends { name: string; rating: number }>(rows: T[], sort: 'asc' | 'desc') {
  const grouped = new Map<string, number[]>()
  for (const row of rows) {
    const values = grouped.get(row.name) ?? []
    values.push(row.rating)
    grouped.set(row.name, values)
  }

  return Array.from(grouped.entries())
    .map(([name, values]) => ({ name, average: average(values), count: values.length }))
    .filter((row) => row.count > 0)
    .sort((a, b) => sort === 'asc' ? a.average - b.average : b.average - a.average)[0] ?? null
}

export async function getReviews(businessId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, customers(full_name,phone,email), staff(full_name), services(name), bookings(booking_date,start_time), pos_orders(order_number,created_at)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return (data ?? []) as ReviewRow[]
}

export async function updateReviewStatus(reviewId: string, status: ReviewStatus): Promise<void> {
  const { error } = await supabase.from('reviews').update({ status }).eq('id', reviewId)
  if (error) throw error
}

export async function getReviewStats(businessId: string): Promise<ReviewStats> {
  const reviews = await getReviews(businessId)
  const visible = reviews.filter((review) => review.status !== 'hidden')
  const ratings = visible.map((review) => Number(review.rating ?? 0)).filter((rating) => rating > 0)

  const staffRows = visible
    .map((review) => {
      const staff = single(review.staff)
      return staff?.full_name ? { name: staff.full_name, rating: Number(review.staff_rating ?? review.rating) } : null
    })
    .filter(Boolean) as { name: string; rating: number }[]

  const serviceRows = visible
    .map((review) => {
      const service = single(review.services)
      return service?.name ? { name: service.name, rating: Number(review.service_rating ?? review.rating) } : null
    })
    .filter(Boolean) as { name: string; rating: number }[]

  const trendMap = new Map<string, number[]>()
  for (const review of visible) {
    const day = review.created_at.slice(0, 10)
    const values = trendMap.get(day) ?? []
    values.push(Number(review.rating))
    trendMap.set(day, values)
  }

  return {
    averageRating: average(ratings),
    totalReviews: reviews.length,
    publishedReviews: reviews.filter((review) => review.status === 'published').length,
    hiddenReviews: reviews.filter((review) => review.status === 'hidden').length,
    bestStaff: groupAverage(staffRows, 'desc'),
    lowRatedService: groupAverage(serviceRows, 'asc'),
    trends: Array.from(trendMap.entries())
      .map(([date, values]) => ({ date, average: average(values), count: values.length }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
  }
}

export async function getPublicReviewContext(
  businessId: string,
  options: { bookingId?: string | null; posOrderId?: string | null },
): Promise<ReviewContext | null> {
  const { data, error } = await supabase.rpc('get_public_review_context', {
    p_business_id: businessId,
    p_booking_id: options.bookingId ?? null,
    p_pos_order_id: options.posOrderId ?? null,
  })
  if (error) throw error
  return data as ReviewContext | null
}

async function getBusinessReviewRoute(businessId: string): Promise<{ name: string; reviewBase: string }> {
  const { data, error } = await supabase
    .from('businesses')
    .select('name, slug')
    .eq('id', businessId)
    .single()
  if (error) throw error

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const routeId = data.slug || businessId
  return {
    name: data.name,
    reviewBase: `${origin}/b/${routeId}/review`,
  }
}

function appendReviewParams(baseUrl: string, params: Record<string, string | null | undefined>): string {
  const url = new URL(baseUrl, typeof window === 'undefined' ? 'https://example.local' : window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  return url.toString()
}

export async function sendBookingReviewRequest(booking: BookingRow): Promise<SendNotificationResult> {
  const customer = single(booking.customers)
  const { name: businessName, reviewBase } = await getBusinessReviewRoute(booking.business_id)
  const reviewLink = appendReviewParams(reviewBase, {
    booking: booking.id,
    customer: booking.customer_id,
    staff: booking.staff_id,
    service: booking.service_id,
  })
  const template = await getTemplate(booking.business_id, 'review_request', 'whatsapp')
  const message = template?.body
    ? renderTemplate(template.body, {
        customer_name: customer?.full_name ?? 'there',
        business_name: businessName,
        review_link: reviewLink,
      })
    : `Hi ${customer?.full_name ?? 'there'}, thank you for visiting ${businessName}. Please rate your experience here: ${reviewLink}`

  return sendNotificationWithResult(booking.business_id, {
    channel: 'whatsapp',
    notificationType: 'review_request',
    title: 'Review request',
    message,
    customerId: booking.customer_id ?? undefined,
    recipient: customer?.phone ?? undefined,
    templateId: template?.id,
  })
}

export async function sendOrderReviewRequest(order: POSOrder): Promise<SendNotificationResult> {
  const rawCustomer = (order as unknown as { customers?: { full_name: string; phone: string | null } | { full_name: string; phone: string | null }[] | null }).customers
  const customer = single(rawCustomer)
  const { name: businessName, reviewBase } = await getBusinessReviewRoute(order.business_id)
  const reviewLink = appendReviewParams(reviewBase, {
    order: order.id,
    customer: order.customer_id,
    staff: order.staff_id,
  })
  const template = await getTemplate(order.business_id, 'review_request', 'whatsapp')
  const message = template?.body
    ? renderTemplate(template.body, {
        customer_name: customer?.full_name ?? order.customer_name ?? 'there',
        business_name: businessName,
        review_link: reviewLink,
      })
    : `Hi ${customer?.full_name ?? order.customer_name ?? 'there'}, thank you for visiting ${businessName}. Please rate your experience here: ${reviewLink}`

  return sendNotificationWithResult(order.business_id, {
    channel: 'whatsapp',
    notificationType: 'review_request',
    title: 'Review request',
    message,
    customerId: order.customer_id ?? undefined,
    recipient: customer?.phone ?? order.customer_phone ?? undefined,
    templateId: template?.id,
  })
}

export function getReviewDisplay(review: ReviewRow) {
  return {
    customerName: single(review.customers)?.full_name ?? 'Guest customer',
    staffName: single(review.staff)?.full_name ?? 'Unassigned',
    serviceName: single(review.services)?.name ?? 'General visit',
    booking: single(review.bookings),
    order: single(review.pos_orders),
  }
}
