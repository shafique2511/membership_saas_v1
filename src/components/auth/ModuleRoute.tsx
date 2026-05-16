import { Outlet } from 'react-router-dom'
import { UpgradePrompt } from '@/components/modules/UpgradePrompt'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAppContext } from '@/context/useAppContext'
import { moduleRequiredPackages } from '@/services/permissions'
import type { ModuleKey } from '@/types'

interface ModuleRouteProps {
  moduleKey: ModuleKey
  moduleName: string
}

export function ModuleRoute({ moduleKey, moduleName }: ModuleRouteProps) {
  const { hasModule, loading, profile } = useAppContext()

  if (loading) {
    return <LoadingState label="Checking module access" />
  }

  if (profile?.role === 'super_admin' || hasModule(moduleKey)) {
    return <Outlet />
  }

  return (
    <UpgradePrompt
      moduleName={moduleName}
      packageName={moduleRequiredPackages[moduleKey] ?? 'a higher package'}
    />
  )
}
