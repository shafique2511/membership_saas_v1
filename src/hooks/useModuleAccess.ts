import { useAppContext } from '@/context/useAppContext'
import type { ModuleKey } from '@/types'

export function useModuleAccess(module: ModuleKey) {
  const { hasModule } = useAppContext()

  return {
    enabled: hasModule(module),
  }
}
