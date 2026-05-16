import type { ModuleKey, Permission, UserRole } from '@/types'

export const rolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    'platform.access',
    'business.manage',
    'staff.manage',
    'customers.manage',
    'bookings.manage',
    'memberships.manage',
    'reports.manage',
    'settings.manage',
    'billing.manage',
    'packages.manage',
    'modules.manage',
    'subscriptions.manage',
    'module_access.override',
  ],
  owner: [
    'business.manage',
    'staff.manage',
    'customers.manage',
    'bookings.manage',
    'memberships.manage',
    'reports.manage',
    'settings.manage',
    'billing.manage',
  ],
  manager: [
    'customers.manage',
    'bookings.manage',
    'memberships.manage',
    'reports.manage',
    'bookings.update_status',
    'bookings.create_walk_in',
    'customers.view_basic',
  ],
  staff: [
    'bookings.view_assigned',
    'bookings.update_status',
    'customers.view_basic',
    'bookings.create_walk_in',
  ],
  customer: [
    'customer.profile.view',
    'customer.booking.create',
    'customer.membership.view',
    'customer.rewards.view',
    'customer.history.view',
  ],
}

export const moduleRequiredPackages: Partial<Record<ModuleKey, string>> = {
  core: 'Starter',
  booking: 'Starter',
  customer_portal: 'Starter',
  reports: 'Starter',
  membership: 'Growth',
  loyalty: 'Growth',
  payment: 'Growth',
  pos: 'Pro',
  inventory: 'Pro',
  staff_commission: 'Pro',
  notification: 'Pro',
  marketing: 'Business Suite',
  multi_branch: 'Business Suite',
  white_label: 'Enterprise',
}

export function roleHasPermission(role: UserRole | undefined, permission: Permission) {
  if (!role) {
    return false
  }

  return rolePermissions[role].includes(permission)
}
