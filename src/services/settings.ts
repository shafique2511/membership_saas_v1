import { supabase } from '@/lib/supabase'

export interface BookingRules {
  id: string
  business_id: string
  slot_duration_minutes: number
  buffer_time_minutes: number
  min_booking_notice_hours: number
  max_advance_days: number
  auto_confirm: boolean
  deposit_required: boolean
  deposit_percentage: number
  cancellation_policy: string
  cancellation_fee_amount: number
  allow_walk_in: boolean
  max_guests_per_booking: number
  created_at: string
  updated_at: string
}

export interface MembershipSettings {
  id: string
  business_id: string
  auto_expiry: boolean
  reminder_days_before: number[]
  allow_freeze: boolean
  max_freeze_days: number
  freeze_cooldown_days: number
  allow_transfer: boolean
  transfer_fee: number
  default_renewal_behavior: string
  pro_rated_renewal: boolean
  grace_period_days: number
  created_at: string
  updated_at: string
}

export interface StaffPermission {
  id: string
  role: string
  permission_key: string
  is_granted: boolean
}

export interface StaffCustomRole {
  id: string
  business_id: string
  role_key: string
  role_name: string
  description: string | null
  is_active: boolean
}

export interface StaffUserPermission {
  id: string
  staff_id: string
  permission_key: string
  is_granted: boolean
  staff?: {
    full_name: string
    email: string | null
    role: string
  }
}

export async function getBookingRules(businessId: string): Promise<BookingRules | null> {
  const { data } = await supabase.rpc('get_booking_rules', { p_business_id: businessId })
  return data as BookingRules | null
}

export async function upsertBookingRules(businessId: string, rules: Partial<BookingRules>): Promise<BookingRules> {
  const { data, error } = await supabase.rpc('upsert_booking_rules', {
    p_business_id: businessId,
    p_slot_duration_minutes: rules.slot_duration_minutes ?? null,
    p_buffer_time_minutes: rules.buffer_time_minutes ?? null,
    p_min_booking_notice_hours: rules.min_booking_notice_hours ?? null,
    p_max_advance_days: rules.max_advance_days ?? null,
    p_auto_confirm: rules.auto_confirm ?? null,
    p_deposit_required: rules.deposit_required ?? null,
    p_deposit_percentage: rules.deposit_percentage ?? null,
    p_cancellation_policy: rules.cancellation_policy ?? null,
    p_cancellation_fee_amount: rules.cancellation_fee_amount ?? null,
    p_allow_walk_in: rules.allow_walk_in ?? null,
    p_max_guests_per_booking: rules.max_guests_per_booking ?? null,
  })
  if (error) throw error
  return data as unknown as BookingRules
}

export async function getMembershipSettings(businessId: string): Promise<MembershipSettings | null> {
  const { data } = await supabase.rpc('get_membership_settings', { p_business_id: businessId })
  return data as MembershipSettings | null
}

export async function upsertMembershipSettings(businessId: string, settings: Partial<MembershipSettings>): Promise<MembershipSettings> {
  const { data, error } = await supabase.rpc('upsert_membership_settings', {
    p_business_id: businessId,
    p_auto_expiry: settings.auto_expiry ?? null,
    p_reminder_days_before: settings.reminder_days_before ?? null,
    p_allow_freeze: settings.allow_freeze ?? null,
    p_max_freeze_days: settings.max_freeze_days ?? null,
    p_freeze_cooldown_days: settings.freeze_cooldown_days ?? null,
    p_allow_transfer: settings.allow_transfer ?? null,
    p_transfer_fee: settings.transfer_fee ?? null,
    p_default_renewal_behavior: settings.default_renewal_behavior ?? null,
    p_pro_rated_renewal: settings.pro_rated_renewal ?? null,
    p_grace_period_days: settings.grace_period_days ?? null,
  })
  if (error) throw error
  return data as unknown as MembershipSettings
}

export async function getStaffPermissions(businessId: string): Promise<StaffPermission[]> {
  const { data } = await supabase.rpc('get_staff_permissions', { p_business_id: businessId })
  return (data as StaffPermission[]) ?? []
}

export async function setStaffPermission(businessId: string, role: string, permissionKey: string, isGranted: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_staff_permission', {
    p_business_id: businessId,
    p_role: role,
    p_permission_key: permissionKey,
    p_is_granted: isGranted,
  })
  if (error) throw error
}

export async function getStaffCustomRoles(businessId: string): Promise<StaffCustomRole[]> {
  const { data } = await supabase.rpc('get_staff_custom_roles', { p_business_id: businessId })
  return (data as StaffCustomRole[]) ?? []
}

export async function createStaffCustomRole(businessId: string, roleName: string, description?: string): Promise<StaffCustomRole> {
  const { data, error } = await supabase.rpc('create_staff_custom_role', {
    p_business_id: businessId,
    p_role_name: roleName,
    p_description: description ?? null,
  })
  if (error) throw error
  return data as unknown as StaffCustomRole
}

export async function setStaffPermissionRole(businessId: string, staffId: string, roleKey: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_staff_permission_role', {
    p_business_id: businessId,
    p_staff_id: staffId,
    p_role_key: roleKey,
  })
  if (error) throw error
}

export async function getStaffUserPermissions(businessId: string, staffId?: string): Promise<StaffUserPermission[]> {
  const { data } = await supabase.rpc('get_staff_user_permissions', {
    p_business_id: businessId,
    p_staff_id: staffId ?? null,
  })
  return (data as StaffUserPermission[]) ?? []
}

export async function setStaffUserPermission(businessId: string, staffId: string, permissionKey: string, isGranted: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_staff_user_permission', {
    p_business_id: businessId,
    p_staff_id: staffId,
    p_permission_key: permissionKey,
    p_is_granted: isGranted,
  })
  if (error) throw error
}
