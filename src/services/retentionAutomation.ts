import { supabase } from '@/lib/supabase'

export interface RetentionAutomationRule {
  id: string
  business_id: string
  rule_key: string
  name: string
  description: string | null
  trigger_type: string
  condition_config: Record<string, unknown>
  notification_type: string
  channel: string
  template_id: string | null
  is_enabled: boolean
  last_run_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RetentionAutomationLog {
  id: string
  business_id: string
  rule_id: string | null
  customer_id: string | null
  action_type: string
  status: string
  notification_id: string | null
  channel: string | null
  recipient: string | null
  message_preview: string | null
  reason: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  rule?: { name?: string | null } | null
  customer?: { full_name?: string | null; phone?: string | null; email?: string | null } | null
}

export interface RetentionRunResult {
  processed: number
  sent: number
  skipped: number
  failed: number
  results: Array<{
    customer_id?: string
    customer_name?: string
    status?: string
    message?: string
    notification_id?: string
  }>
}

export async function seedRetentionAutomation(businessId: string): Promise<void> {
  const { error } = await supabase.rpc('seed_phase21_retention_automation', { p_business_id: businessId })
  if (error) throw error
}

export async function getRetentionRules(businessId: string): Promise<RetentionAutomationRule[]> {
  const { data, error } = await supabase
    .from('retention_automation_rules')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateRetentionRule(id: string, updates: Partial<RetentionAutomationRule>): Promise<void> {
  const { error } = await supabase
    .from('retention_automation_rules')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function runRetentionRule(ruleId: string, preview: boolean): Promise<RetentionRunResult> {
  const { data, error } = await supabase.rpc('run_retention_automation_rule', {
    p_rule_id: ruleId,
    p_preview: preview,
  })

  if (error) throw error
  return {
    processed: Number(data?.processed ?? 0),
    sent: Number(data?.sent ?? 0),
    skipped: Number(data?.skipped ?? 0),
    failed: Number(data?.failed ?? 0),
    results: Array.isArray(data?.results) ? data.results : [],
  }
}

export async function getRetentionLogs(businessId: string): Promise<RetentionAutomationLog[]> {
  const { data, error } = await supabase
    .from('retention_automation_logs')
    .select('*, rule:retention_automation_rules(name), customer:customers(full_name, phone, email)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data ?? []
}

export const RETENTION_RULE_LABELS: Record<string, string> = {
  inactive_30_days: 'Inactive 30 days',
  membership_expiring_3_days: 'Membership expiring',
  birthday_this_month: 'Birthday this month',
  no_show_follow_up: 'No-show follow-up',
  first_time_customer_thank_you: 'First-time thank you',
  high_spender_vip_reward: 'High spender VIP',
}
