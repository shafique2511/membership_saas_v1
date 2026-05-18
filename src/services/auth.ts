import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { roleHasPermission } from '@/services/permissions'
import type { ModuleKey, Permission, UserProfile, UserRole } from '@/types'

export class AuthRequiredError extends Error {}
export class RoleRequiredError extends Error {}
export class ModuleRequiredError extends Error {}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data.user
}

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const id = userId ?? (await getCurrentUser())?.id

  if (!id) {
    return null
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as UserProfile | null
}

export async function getBusinessId(): Promise<string | null> {
  const profile = await getUserProfile()
  return profile?.business_id ?? null
}

export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  const profile = await getUserProfile()
  const roles = Array.isArray(role) ? role : [role]

  return Boolean(profile && roles.includes(profile.role))
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const profile = await getUserProfile()

  if (!profile) {
    return false
  }

  if (profile.role === 'super_admin') {
    return true
  }

  if (!profile.business_id) {
    return roleHasPermission(profile.role, permission)
  }

  const staffOverride = await getStaffPermissionOverride(profile.business_id, permission)

  if (staffOverride !== null) {
    return staffOverride
  }

  const roleOverride = await getRolePermissionOverride(profile.business_id, profile.role, permission)

  if (roleOverride !== null) {
    return roleOverride
  }

  return roleHasPermission(profile.role, permission)
}

async function getRolePermissionOverride(businessId: string, role: UserRole, permission: Permission): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('staff_permissions')
    .select('is_granted')
    .eq('business_id', businessId)
    .eq('role', role)
    .eq('permission_key', permission)
    .maybeSingle()

  if (error) {
    throw error
  }

  return typeof data?.is_granted === 'boolean' ? data.is_granted : null
}

async function getStaffPermissionOverride(businessId: string, permission: Permission): Promise<boolean | null> {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return null
  }

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', currentUser.id)
    .eq('status', 'active')
    .maybeSingle()

  if (staffError) {
    throw staffError
  }

  if (!staffData?.id) {
    return null
  }

  const { data, error } = await supabase
    .from('staff_user_permissions')
    .select('is_granted')
    .eq('business_id', businessId)
    .eq('staff_id', staffData.id)
    .eq('permission_key', permission)
    .maybeSingle()

  if (error) {
    throw error
  }

  return typeof data?.is_granted === 'boolean' ? data.is_granted : null
}

export async function hasModuleAccess(moduleKey: ModuleKey): Promise<boolean> {
  const profile = await getUserProfile()

  if (!profile) {
    return false
  }

  if (profile.role === 'super_admin') {
    return true
  }

  if (!profile.business_id) {
    return false
  }

  const { data, error } = await supabase
    .from('business_module_access')
    .select('id')
    .eq('business_id', profile.business_id)
    .eq('module_key', moduleKey)
    .eq('is_enabled', true)
    .neq('access_level', 'none')
    .lte('start_date', new Date().toISOString().slice(0, 10))
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString().slice(0, 10)}`)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new AuthRequiredError('Authentication is required.')
  }

  return user
}

export async function requireRole(role: UserRole | UserRole[]) {
  const user = await requireAuth()
  const allowed = await hasRole(role)

  if (!allowed) {
    throw new RoleRequiredError('Your role cannot access this area.')
  }

  return user
}

export async function requireModule(moduleKey: ModuleKey) {
  const user = await requireAuth()
  const allowed = await hasModuleAccess(moduleKey)

  if (!allowed) {
    throw new ModuleRequiredError('This module is not enabled for your business.')
  }

  return user
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password })
}

export async function registerBusinessOwner(input: {
  businessName: string
  businessType: string
  ownerName: string
  email: string
  password: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.ownerName,
        role: 'owner',
        business_name: input.businessName,
        business_type: input.businessType,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function registerCustomer(input: {
  businessId: string
  fullName: string
  email: string
  phone?: string
  password: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        role: 'customer',
        business_id: input.businessId,
        phone: input.phone,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function inviteStaff(input: {
  businessId: string
  branchId?: string
  email: string
  fullName: string
  role: 'manager' | 'staff'
}) {
  const invitedBy = await requireRole(['owner', 'manager', 'super_admin'])
  const canManageStaff = await hasPermission('staff.manage')

  if (!canManageStaff) {
    throw new RoleRequiredError('You do not have permission to invite staff.')
  }

  const token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('staff_invitations')
    .insert({
      business_id: input.businessId,
      branch_id: input.branchId,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      invited_by: invitedBy.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function acceptStaffInvitation(input: {
  token: string
  password: string
  phone?: string
}) {
  const { data: invitation, error } = await supabase.rpc('get_staff_invitation', {
    invitation_token: input.token,
  })

  if (error) {
    throw error
  }

  const invite = Array.isArray(invitation) ? invitation[0] : null

  if (!invite) {
    throw new Error('Invitation is invalid or expired.')
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: invite.email,
    password: input.password,
    options: {
      data: {
        full_name: invite.full_name,
        role: invite.role,
        business_id: invite.business_id,
        invitation_token: input.token,
        phone: input.phone,
      },
    },
  })

  if (signUpError) {
    throw signUpError
  }

  return signUpData
}
