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
  | 'data_ownership_backup'
  | 'ai_assistant'

export type PackageKey = 'starter' | 'growth' | 'pro' | 'business_suite' | 'enterprise'

export type Permission =
  | 'platform.access'
  | 'core.access'
  | 'business.manage'
  | 'business.delete'
  | 'staff.manage'
  | 'staff.permissions.manage'
  | 'customers.manage'
  | 'customers.view_basic'
  | 'customers.create'
  | 'customers.edit'
  | 'crm.notes.add'
  | 'crm.tags.manage'
  | 'bookings.manage'
  | 'bookings.view_assigned'
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.edit'
  | 'bookings.cancel'
  | 'bookings.check_in'
  | 'bookings.update_status'
  | 'bookings.create_walk_in'
  | 'memberships.manage'
  | 'memberships.view'
  | 'memberships.assign'
  | 'pos.access'
  | 'pos.discount'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'payments.process'
  | 'payments.refund'
  | 'payments.view'
  | 'reports.manage'
  | 'reports.view'
  | 'reports.export'
  | 'loyalty.manage'
  | 'records.delete'
  | 'notifications.manage'
  | 'marketing.manage'
  | 'branches.manage'
  | 'white_label.manage'
  | 'data.export'
  | 'data.backup.manage'
  | 'data.import'
  | 'ai.assistant.access'
  | 'settings.manage'
  | 'settings.view'
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
