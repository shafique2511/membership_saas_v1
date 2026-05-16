import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'staff' | 'customer'

export type BusinessType =
  | 'barber_shop'
  | 'coffee_shop'
  | 'salon'
  | 'spa'
  | 'clinic'
  | 'event_space'
  | 'custom'

export type ModuleKey =
  | 'core'
  | 'booking'
  | 'membership'
  | 'loyalty'
  | 'pos'
  | 'inventory'
  | 'staff_commission'
  | 'payment'
  | 'notification'
  | 'reports'
  | 'marketing'
  | 'multi_branch'
  | 'customer_portal'
  | 'white_label'

export type PackageKey = 'starter' | 'growth' | 'pro' | 'business_suite' | 'enterprise'

export type Permission =
  | 'platform.access'
  | 'business.manage'
  | 'business.delete'
  | 'staff.manage'
  | 'customers.manage'
  | 'customers.view_basic'
  | 'bookings.manage'
  | 'bookings.view_assigned'
  | 'bookings.update_status'
  | 'bookings.create_walk_in'
  | 'memberships.manage'
  | 'reports.manage'
  | 'settings.manage'
  | 'billing.manage'
  | 'packages.manage'
  | 'modules.manage'
  | 'subscriptions.manage'
  | 'module_access.override'
  | 'customer.profile.view'
  | 'customer.booking.create'
  | 'customer.membership.view'
  | 'customer.rewards.view'
  | 'customer.history.view'

export interface UserProfile {
  id: string
  business_id: string | null
  branch_id: string | null
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface AuthResult {
  success: boolean
  message?: string
}

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module?: ModuleKey
  roles?: UserRole[]
}

export interface StatItem {
  label: string
  value: string
  hint?: string
  trend?: string
  icon?: LucideIcon
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}
