import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { getCustomerByUserId, type CustomerAccount } from '@/services/customerPortal'
import { useCustomerBusinessRoute } from '@/hooks/useCustomerBusinessRoute'

export function useCustomerAccount() {
  const { profile } = useAppContext()
  const { businessId, businessSlug, routeBase, portalHome, loading: routeLoading } = useCustomerBusinessRoute()
  const bizId = businessId || profile?.business_id || ''
  const [customer, setCustomer] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (routeLoading) return
    if (!profile?.id || !bizId) {
      setCustomer(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      setCustomer(await getCustomerByUserId(profile.id, bizId))
    } finally {
      setLoading(false)
    }
  }, [bizId, profile?.id, routeLoading])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return {
    businessId: bizId,
    businessSlug,
    customer,
    customerId: customer?.id ?? '',
    loading,
    portalHome,
    refreshCustomer: load,
    routeBase,
  }
}
