import { useAppContext } from '@/context/useAppContext'
import type { ModuleKey } from '@/types'

export function useModuleAccess(module: ModuleKey) {
  const { canAccessModule, hasModule } = useAppContext()

  return {
    enabled: hasModule(module),
    accessible: canAccessModule(module),
  }
}
