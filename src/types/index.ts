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
