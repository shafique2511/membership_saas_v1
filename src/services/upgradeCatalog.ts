import { moduleLabels, packageCatalog } from '@/services/packageCatalog'
import { moduleRequiredPackages } from '@/services/permissions'
import type { ModuleKey } from '@/types'

const fallbackBenefits = [
  'Unlock this workflow for your team',
  'Keep sales, customer records, and reports in one workspace',
  'Use module-aware permissions and package limits safely',
]

export const moduleUpgradeBenefits: Partial<Record<ModuleKey, string[]>> = {
  membership: ['Sell recurring or prepaid packages', 'Track active members and remaining visits', 'Connect memberships to customer records'],
  loyalty: ['Reward repeat customers with points', 'Create redeemable rewards', 'Improve customer retention'],
  payment: ['Track paid, pending, refunded, and verified payments', 'Support multiple payment methods', 'Keep receipts connected to bookings and POS'],
  pos: ['Checkout services and products from one screen', 'Capture discounts and payment method breakdowns', 'Connect sales to customer history'],
  inventory: ['Track product stock and low-stock alerts', 'Estimate product profit from cost price', 'Connect stock movement to POS sales'],
  staff_commission: ['Manage staff records and schedules', 'Track commissions after completed services', 'Review staff performance'],
  notification: ['Send operational WhatsApp and customer notifications', 'Manage templates and delivery logs', 'Automate retention messages'],
  marketing: ['Create promo codes and campaigns', 'Segment customers for targeted offers', 'Measure campaign performance'],
  multi_branch: ['Manage multiple locations', 'Compare branch performance', 'Separate staff, bookings, and stock by branch'],
  white_label: ['Use custom branding options', 'Prepare a more branded customer experience', 'Support enterprise-level presentation'],
  ai_assistant: ['Summarize sales and performance quickly', 'Find inactive customers and campaign ideas', 'Explain reports in plain language'],
  data_ownership_backup: ['Export important business records', 'Track backup history', 'Improve operational data control'],
}

export function getRequiredPackageForModule(moduleKey: ModuleKey) {
  const requiredPackageName = moduleRequiredPackages[moduleKey] ?? 'a higher package'
  const packageDef = packageCatalog.find((item) => item.name === requiredPackageName)

  return {
    name: requiredPackageName,
    key: packageDef?.key,
  }
}

export function getModuleUpgradeInfo(moduleKey: ModuleKey, moduleName?: string) {
  return {
    featureName: moduleName ?? moduleLabels[moduleKey] ?? moduleKey,
    requiredPackage: getRequiredPackageForModule(moduleKey),
    benefits: moduleUpgradeBenefits[moduleKey] ?? fallbackBenefits,
  }
}

export function getLockedModules(enabledModules: ModuleKey[]) {
  const enabled = new Set(enabledModules)

  return (Object.keys(moduleLabels) as ModuleKey[])
    .filter((moduleKey) => !enabled.has(moduleKey))
    .map((moduleKey) => ({
      moduleKey,
      ...getModuleUpgradeInfo(moduleKey),
    }))
}
