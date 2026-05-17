import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Gift,
  Megaphone,
  Package,
  Puzzle,
  Settings,
  ShoppingCart,
  Store,
  Users,
  WalletCards,
  Warehouse,
  Gauge,
  UserRound,
  PiggyBank,
  FileText,
  Database,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/types'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  module?: ModuleKey
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const businessNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/business', icon: LayoutDashboard, module: 'core' },
      { label: 'Bookings', href: '/business/bookings', icon: CalendarDays, module: 'booking' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'POS', href: '/business/pos', icon: ShoppingCart, module: 'pos' },
      { label: 'Customers', href: '/business/memberships', icon: Users, module: 'membership' },
      { label: 'Memberships', href: '/business/memberships', icon: WalletCards, module: 'membership' },
      { label: 'Loyalty', href: '/business/loyalty', icon: Gift, module: 'loyalty' },
    ],
  },
  {
    title: 'Inventory & Staff',
    items: [
      { label: 'Products', href: '/business/inventory', icon: Warehouse, module: 'inventory' },
      { label: 'Staff', href: '/business/staff', icon: UserRound, module: 'staff_commission' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payments', href: '/business/payments', icon: CreditCard, module: 'payment' },
      { label: 'Billing', href: '/business/subscription', icon: FileText, module: 'core' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Marketing', href: '/business/marketing', icon: Megaphone, module: 'marketing' },
      { label: 'Reports', href: '/business/reports', icon: BarChart3, module: 'reports' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Branches', href: '/business/branches', icon: Store, module: 'multi_branch' },
      { label: 'Modules', href: '/business/module-access', icon: Puzzle, module: 'core' },
      { label: 'Add-ons', href: '/business/add-ons', icon: Package, module: 'core' },
      { label: 'Usage', href: '/business/usage', icon: Gauge, module: 'core' },
      { label: 'Settings', href: '/business/settings', icon: Settings, module: 'core' },
      { label: 'Data & Backup', href: '/business/settings/data-ownership', icon: Database, module: 'data_ownership_backup' },
    ],
  },
]

export const adminNavSections: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Businesses', href: '/admin/businesses', icon: Building2 },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Packages', href: '/admin/packages', icon: Package },
      { label: 'Modules', href: '/admin/modules', icon: Puzzle },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Add-ons', href: '/admin/add-ons', icon: Puzzle },
      { label: 'Invoices', href: '/admin/invoices', icon: FileText },
      { label: 'Payments', href: '/admin/payments', icon: PiggyBank },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Usage', href: '/admin/usage', icon: Gauge },
      { label: 'Audit logs', href: '/admin/audit-logs', icon: FileText },
      { label: 'Data governance', href: '/admin/data-governance', icon: Database },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

export function getBusinessNavItems(hasModule: (m: ModuleKey) => boolean): NavItem[] {
  const items: NavItem[] = []
  for (const section of businessNavSections) {
    for (const item of section.items) {
      if (!item.module || hasModule(item.module)) {
        items.push(item)
      }
    }
  }
  return items
}

export function getAdminNavItems(): NavItem[] {
  const items: NavItem[] = []
  for (const section of adminNavSections) {
    for (const item of section.items) {
      items.push(item)
    }
  }
  return items
}
