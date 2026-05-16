import { packageCatalog } from '@/services/packageCatalog'
import type { ModuleKey, PackageKey } from '@/types'

export const packageModuleMap = packageCatalog.reduce(
  (acc, item) => ({
    ...acc,
    [item.key]: item.modules.map((moduleRule) => moduleRule.module),
  }),
  {} as Record<PackageKey, ModuleKey[]>,
)

export function isModuleInPackage(packageKey: PackageKey, module: ModuleKey) {
  return packageModuleMap[packageKey].includes(module)
}
