import { useParams } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export function CustomerProtectedRoute() {
  const { businessSlug } = useParams()

  return (
    <ProtectedRoute
      roles={['customer', 'super_admin']}
      redirectTo={businessSlug ? `/b/${businessSlug}/login` : '/auth/login'}
    />
  )
}
