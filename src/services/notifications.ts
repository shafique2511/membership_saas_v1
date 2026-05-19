import { supabase } from '@/lib/supabase'

export interface NotificationTemplate {
  id: string
  business_id: string
  notification_type: string
  channel: string
  subject: string | null
  body: string
  variables: string[]
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChannelSettings {
  id: string
  business_id: string
  channel: string
  config: Record<string, unknown>
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  business_id: string
  customer_id: string | null
  channel: string
  notification_type: string
  title: string
  message: string
  status: string
  template_id: string | null
  error_message: string | null
  action_url: string | null
  delivery_provider: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  recipient: string | null
  sent_at: string | null
  created_at: string
}

export interface NotificationSchedule {
  id: string
  business_id: string
  notification_type: string
  channel: string
  template_id: string | null
  reference_type: string | null
  reference_id: string | null
  scheduled_at: string
  sent_at: string | null
  status: string
  created_at: string
}

export interface NotificationBroadcast {
  id: string
  business_id: string
  name: string
  channel: string
  template_id: string | null
  subject: string | null
  body: string
  audience_filter: Record<string, unknown>
  scheduled_at: string | null
  sent_at: string | null
  status: string
  total_recipients: number
  success_count: number
  fail_count: number
  created_at: string
  updated_at: string
}

type TemplateVariables = Record<string, string>

const NOTIFICATION_TYPES = [
  'booking_confirmation', 'booking_reminder', 'booking_cancellation',
  'booking_reschedule', 'payment_confirmation', 'membership_expiry',
  'membership_renewal', 'birthday_message', 'no_show_warning', 'promo_broadcast',
  'receipt_message', 'inactive_customer_promo', 'membership_expiring_soon',
  'birthday_reward', 'no_show_follow_up', 'first_time_thank_you',
  'high_spender_vip_reward',
] as const

const CHANNELS = ['email', 'whatsapp', 'telegram', 'sms', 'in_app'] as const

const ALL_VARIABLES = [
  'customer_name', 'business_name', 'booking_date', 'booking_time',
  'service_name', 'staff_name', 'membership_name', 'expiry_date',
  'amount', 'payment_status', 'promo_code', 'reward_name',
] as const

export function renderTemplate(template: string, variables: TemplateVariables): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '')
  }
  return result
}

export function normalizeWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`
}

const mockChannelSend = async (_channel: string, recipient: string, _subject: string | null, _body: string): Promise<{ success: boolean; error?: string }> => {
  await new Promise((r) => setTimeout(r, 300))
  if (!recipient) return { success: false, error: 'No recipient specified' }
  return { success: true }
}

export interface SendNotificationResult {
  success: boolean
  status: string
  actionUrl: string | null
  error?: string
}

// ---- Templates ----

export async function getTemplates(businessId: string): Promise<NotificationTemplate[]> {
  const { data } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('business_id', businessId)
    .order('notification_type')
  return data ?? []
}

export async function getTemplateById(id: string): Promise<NotificationTemplate | null> {
  const { data } = await supabase.from('notification_templates').select('*').eq('id', id).single()
  return data
}

export async function getTemplate(businessId: string, notificationType: string, channel: string): Promise<NotificationTemplate | null> {
  const { data } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('business_id', businessId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .single()
  return data
}

export async function upsertTemplate(businessId: string, template: Partial<NotificationTemplate> & { notification_type: string; channel: string; body: string }): Promise<void> {
  await supabase
    .from('notification_templates')
    .upsert({ business_id: businessId, ...template })
    .select()
    .single()
}

export async function deleteTemplate(id: string): Promise<void> {
  await supabase.from('notification_templates').delete().eq('id', id)
}

export async function resetToDefaults(businessId: string): Promise<void> {
  await supabase.rpc('seed_default_templates', { p_business_id: businessId })
  await supabase.rpc('seed_phase17_notification_templates', { p_business_id: businessId })
}

// ---- Channel Settings ----

export async function getChannelSettings(businessId: string): Promise<ChannelSettings[]> {
  const { data } = await supabase
    .from('channel_settings')
    .select('*')
    .eq('business_id', businessId)
  return data ?? []
}

export async function upsertChannelSettings(businessId: string, channel: string, config: Record<string, unknown>, isEnabled: boolean): Promise<void> {
  await supabase
    .from('channel_settings')
    .upsert({ business_id: businessId, channel, config, is_enabled: isEnabled })
    .select()
    .single()
}

// ---- Sending ----

export async function sendNotification(
  businessId: string,
  params: {
    channel: string
    notificationType: string
    title: string
    message: string
    customerId?: string
    recipient?: string
    templateId?: string
  },
): Promise<boolean> {
  const result = await sendNotificationWithResult(businessId, params)
  return result.success
}

export async function sendNotificationWithResult(
  businessId: string,
  params: {
    channel: string
    notificationType: string
    title: string
    message: string
    customerId?: string
    recipient?: string
    templateId?: string
  },
): Promise<SendNotificationResult> {
  const channelName = params.channel as typeof CHANNELS[number]

  const actionUrl = channelName === 'whatsapp' && params.recipient
    ? buildWhatsAppLink(params.recipient, params.message)
    : null
  const mockResult = channelName === 'whatsapp'
    ? { success: Boolean(params.recipient), error: params.recipient ? undefined : 'No WhatsApp recipient specified' }
    : await mockChannelSend(channelName, params.recipient ?? '', params.title, params.message)
  const status = channelName === 'whatsapp' && mockResult.success ? 'queued' : mockResult.success ? 'sent' : 'failed'

  const { error } = await supabase.from('notifications').insert({
    business_id: businessId,
    customer_id: params.customerId,
    channel: channelName,
    notification_type: params.notificationType,
    title: params.title,
    message: params.message,
    recipient: params.recipient,
    template_id: params.templateId,
    status,
    error_message: mockResult.error,
    action_url: actionUrl,
    delivery_provider: channelName === 'whatsapp' ? 'wa_link' : 'mock',
    metadata: { whatsapp_first: channelName === 'whatsapp' },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })

  if (error) console.error('Failed to log notification:', error)
  return { success: mockResult.success, status, actionUrl, error: mockResult.error }
}

export async function sendTemplatedNotification(
  businessId: string,
  params: {
    channel: string
    notificationType: string
    customerId?: string
    recipient?: string
    variables: TemplateVariables
  },
): Promise<boolean> {
  const template = await getTemplate(businessId, params.notificationType, params.channel)
  if (!template || !template.is_active) return false

  const body = renderTemplate(template.body, params.variables)
  const title = template.subject ? renderTemplate(template.subject, params.variables) : params.notificationType.replace(/_/g, ' ')

  return sendNotification(businessId, {
    channel: params.channel,
    notificationType: params.notificationType,
    title,
    message: body,
    customerId: params.customerId,
    recipient: params.recipient,
    templateId: template.id,
  })
}

// ---- Notification Log ----

export async function getNotifications(businessId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export async function getNotificationById(id: string): Promise<Notification | null> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
}

// ---- Schedules ----

export async function getSchedules(businessId: string): Promise<NotificationSchedule[]> {
  const { data } = await supabase
    .from('notification_schedules')
    .select('*')
    .eq('business_id', businessId)
    .order('scheduled_at')
  return data ?? []
}

export async function createSchedule(businessId: string, schedule: Partial<NotificationSchedule>): Promise<void> {
  await supabase
    .from('notification_schedules')
    .insert({ business_id: businessId, ...schedule })
}

export async function cancelSchedule(id: string): Promise<void> {
  await supabase.from('notification_schedules').update({ status: 'cancelled' }).eq('id', id)
}

// ---- Broadcasts ----

export async function getBroadcasts(businessId: string): Promise<NotificationBroadcast[]> {
  const { data } = await supabase
    .from('notification_broadcasts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createBroadcast(businessId: string, broadcast: Partial<NotificationBroadcast>): Promise<string | null> {
  const { data } = await supabase
    .from('notification_broadcasts')
    .insert({ business_id: businessId, ...broadcast })
    .select('id')
    .single()
  return data?.id ?? null
}

export async function updateBroadcast(id: string, updates: Partial<NotificationBroadcast>): Promise<void> {
  await supabase.from('notification_broadcasts').update(updates).eq('id', id)
}

export async function cancelBroadcast(id: string): Promise<void> {
  await supabase.from('notification_broadcasts').update({ status: 'cancelled' }).eq('id', id)
}

export { NOTIFICATION_TYPES, CHANNELS, ALL_VARIABLES }
