import { supabase } from '@/lib/supabase'

export interface AuditLog {
  id: string
  business_id: string | null
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_profiles?: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

export async function getBusinessAuditLogs(
  businessId: string,
  filters: { action?: string; tableName?: string; limit?: number } = {},
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200)

  if (filters.action) {
    query = query.eq('action', filters.action)
  }

  if (filters.tableName) {
    query = query.eq('table_name', filters.tableName)
  }

  const { data, error } = await query
  if (error) throw error

  const logs = (data ?? []) as AuditLog[]
  const userIds = Array.from(new Set(logs.map((row) => row.user_id).filter(Boolean))) as string[]

  if (!userIds.length) {
    return logs
  }

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id,full_name,email')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, { full_name: profile.full_name, email: profile.email }]))
  return logs.map((row) => ({
    ...row,
    user_profiles: row.user_id ? profileMap.get(row.user_id) ?? null : null,
  }))
}

export async function getAuditFilterOptions(businessId: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action,table_name')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error

  const actions = Array.from(new Set((data ?? []).map((row) => String(row.action)).filter(Boolean))).sort()
  const tables = Array.from(new Set((data ?? []).map((row) => String(row.table_name)).filter(Boolean))).sort()
  return { actions, tables }
}

export function formatAuditAction(action: string) {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
