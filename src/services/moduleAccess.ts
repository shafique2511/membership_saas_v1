import type { ModuleKey, PackageKey } from '@/types'

export const packageModuleMap: Record<PackageKey, ModuleKey[]> = {
  starter: ['core', 'booking', 'customer_portal', 'reports'],
  growth: ['core', 'booking', 'membership', 'loyalty', 'payment', 'customer_portal', 'reports'],
  pro: [
    'core',
    'booking',
    'membership',
    'loyalty',
    'pos',
    'inventory',
    'staff_commission',
    'payment',
    'notification',
    'reports',
    'customer_portal',
  ],
  business_suite: [
    'core',
    'booking',
    'membership',
    'loyalty',
    'pos',
    'inventory',
    'staff_commission',
    'payment',
    'notification',
    'reports',
    'marketing',
    'multi_branch',
    'customer_portal',
  ],
  enterprise: [
    'core',
    'booking',
    'membership',
    'loyalty',
    'pos',
    'inventory',
    'staff_commission',
    'payment',
    'notification',
    'reports',
    'marketing',
    'multi_branch',
    'customer_portal',
    'white_label',
  ],
}

export function isModuleInPackage(packageKey: PackageKey, module: ModuleKey) {
  return packageModuleMap[packageKey].includes(module)
}
