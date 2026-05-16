import { type ReactNode } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { UpgradePrompt } from '@/components/modules/UpgradePrompt'
import type { ModuleKey } from '@/types'

interface ModuleLockProps {
  module: ModuleKey
  moduleName: string
  children: ReactNode
}

export function ModuleLock({ module, moduleName, children }: ModuleLockProps) {
  const { hasModule } = useAppContext()

  if (!hasModule(module)) {
    return <UpgradePrompt moduleName={moduleName} />
  }

  return children
}
