import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { resolveBusinessSlug } from '@/services/customerPortal'

export function useCustomerBusinessRoute() {
  const { businessId, businessSlug } = useParams()
  const { profile } = useAppContext()
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(businessSlug && !businessId))

  const load = useCallback(async () => {
    if (!businessSlug || businessId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      setResolvedId(await resolveBusinessSlug(businessSlug))
    } finally {
      setLoading(false)
    }
  }, [businessId, businessSlug])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const routeBusinessId = businessId ?? resolvedId ?? profile?.business_id ?? ''
  const routeBase = useMemo(() => {
    if (businessSlug) return `/b/${businessSlug}`
    if (businessId) return `/customer/${businessId}`
    if (profile?.business_id) return `/customer/${profile.business_id}`
    return '/customer'
  }, [businessId, businessSlug, profile?.business_id])

  return {
    businessId: routeBusinessId,
    businessSlug,
    loading,
    portalHome: businessSlug ? `${routeBase}/portal` : routeBase,
    routeBase,
  }
}
