import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAppContext } from '@/context/useAppContext'
import type { Permission, UserRole } from '@/types'

interface ProtectedRouteProps {
  roles?: UserRole[]
  permission?: Permission
  redirectTo?: string
}

export function ProtectedRoute({ roles, permission, redirectTo = '/auth/login' }: ProtectedRouteProps) {
  const location = useLocation()
  const { hasPermission, hasRole, loading, user } = useAppContext()

  if (loading) {
    return <LoadingState label="Checking access" />
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  if (roles && !hasRole(roles)) {
    return <Navigate to="/auth/unauthorized" replace />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/auth/unauthorized" replace />
  }

  return <Outlet />
}
