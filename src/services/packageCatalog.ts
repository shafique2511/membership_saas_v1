import type { ModuleKey, PackageKey } from '@/types'

export interface PackageModuleRule {
  module: ModuleKey
  access: 'basic' | 'pro' | 'advanced' | 'unlimited'
}

export interface PackageLimitRule {
  customers?: number | 'custom'
  staff?: number | 'custom'
  branches?: number | 'custom'
  bookingsPerMonth?: number | 'custom'
  whatsappMessagesPerMonth?: number | 'custom'
  customDomain?: boolean
  prioritySupport?: boolean
}

export interface PackageDefinition {
  key: PackageKey
  name: string
  summary: string
  monthlyPrice: string
  modules: PackageModuleRule[]
  limits: PackageLimitRule
}

export const packageCatalog: PackageDefinition[] = [
  {
    key: 'starter',
    name: 'Starter',
    summary: 'Core booking and customer portal setup for small teams.',
    monthlyPrice: 'RM 99',
    modules: [
      { module: 'core', access: 'unlimited' },
      { module: 'data_ownership_backup', access: 'unlimited' },
      { module: 'booking', access: 'basic' },
      { module: 'customer_portal', access: 'basic' },
      { module: 'reports', access: 'basic' },
    ],
    limits: { customers: 300, staff: 2, branches: 1, bookingsPerMonth: 100 },
  },
  {
    key: 'growth',
    name: 'Growth',
    summary: 'Adds membership, loyalty, and basic payment controls.',
    monthlyPrice: 'RM 199',
    modules: [
      { module: 'core', access: 'unlimited' },
      { module: 'data_ownership_backup', access: 'unlimited' },
      { module: 'booking', access: 'pro' },
      { module: 'membership', access: 'basic' },
      { module: 'loyalty', access: 'basic' },
      { module: 'payment', access: 'basic' },
      { module: 'customer_portal', access: 'pro' },
      { module: 'reports', access: 'basic' },
    ],
    limits: { customers: 1000, staff: 5, branches: 1, bookingsPerMonth: 300 },
  },
  {
    key: 'pro',
    name: 'Pro',
    summary: 'Operational suite for selling, inventory, staff, and notifications.',
    monthlyPrice: 'RM 399',
    modules: [
      { module: 'core', access: 'unlimited' },
      { module: 'data_ownership_backup', access: 'unlimited' },
      { module: 'booking', access: 'pro' },
      { module: 'membership', access: 'pro' },
      { module: 'loyalty', access: 'pro' },
      { module: 'pos', access: 'basic' },
      { module: 'inventory', access: 'basic' },
      { module: 'staff_commission', access: 'basic' },
      { module: 'payment', access: 'pro' },
      { module: 'notification', access: 'basic' },
      { module: 'customer_portal', access: 'pro' },
      { module: 'reports', access: 'pro' },
    ],
    limits: {
      customers: 5000,
      staff: 15,
      branches: 2,
      bookingsPerMonth: 1000,
      whatsappMessagesPerMonth: 500,
    },
  },
  {
    key: 'business_suite',
    name: 'Business Suite',
    summary: 'Advanced workflows for larger service businesses and branches.',
    monthlyPrice: 'RM 699',
    modules: [
      { module: 'core', access: 'unlimited' },
      { module: 'data_ownership_backup', access: 'unlimited' },
      { module: 'booking', access: 'advanced' },
      { module: 'membership', access: 'advanced' },
      { module: 'loyalty', access: 'advanced' },
      { module: 'pos', access: 'pro' },
      { module: 'inventory', access: 'pro' },
      { module: 'staff_commission', access: 'pro' },
      { module: 'payment', access: 'pro' },
      { module: 'notification', access: 'pro' },
      { module: 'customer_portal', access: 'advanced' },
      { module: 'reports', access: 'advanced' },
      { module: 'marketing', access: 'pro' },
      { module: 'multi_branch', access: 'basic' },
    ],
    limits: {
      customers: 20000,
      staff: 50,
      branches: 5,
      bookingsPerMonth: 5000,
      whatsappMessagesPerMonth: 2000,
    },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    summary: 'All modules, white label, custom limits, and priority support.',
    monthlyPrice: 'Custom',
    modules: [
      { module: 'core', access: 'unlimited' },
      { module: 'data_ownership_backup', access: 'unlimited' },
      { module: 'booking', access: 'unlimited' },
      { module: 'membership', access: 'unlimited' },
      { module: 'loyalty', access: 'unlimited' },
      { module: 'pos', access: 'unlimited' },
      { module: 'inventory', access: 'unlimited' },
      { module: 'staff_commission', access: 'unlimited' },
      { module: 'payment', access: 'unlimited' },
      { module: 'notification', access: 'unlimited' },
      { module: 'customer_portal', access: 'unlimited' },
      { module: 'reports', access: 'unlimited' },
      { module: 'marketing', access: 'unlimited' },
      { module: 'multi_branch', access: 'advanced' },
      { module: 'white_label', access: 'unlimited' },
      { module: 'ai_assistant', access: 'unlimited' },
    ],
    limits: {
      customers: 'custom',
      staff: 'custom',
      branches: 'custom',
      bookingsPerMonth: 'custom',
      whatsappMessagesPerMonth: 'custom',
      customDomain: true,
      prioritySupport: true,
    },
  },
]

export const moduleLabels: Record<ModuleKey, string> = {
  core: 'Core',
  booking: 'Booking',
  membership: 'Membership',
  loyalty: 'Loyalty',
  pos: 'POS',
  inventory: 'Inventory',
  staff_commission: 'Staff Commission',
  payment: 'Payment',
  notification: 'Notification',
  reports: 'Reports',
  marketing: 'Marketing',
  multi_branch: 'Multi-Branch',
  customer_portal: 'Customer Portal',
  white_label: 'White Label',
  data_ownership_backup: 'Data Ownership & Backup',
  ai_assistant: 'AI Assistant',
}

export function getPackageDefinition(packageKey: PackageKey) {
  return packageCatalog.find((item) => item.key === packageKey)
}
