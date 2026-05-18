import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBusinessMembershipPlans,
  getBusinessServices,
  getPublicBusiness,
  getPublicBusinessBySlug,
  type PublicBusiness,
} from '@/services/customerPortal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Scissors, Sparkles, ArrowRight } from 'lucide-react'

const BUSINESS_ICONS: Record<string, string> = {
  barber_shop: 'BAR',
  coffee_shop: 'CAFE',
  salon: 'SALON',
  spa: 'SPA',
  clinic: 'CLINIC',
  event_space: 'EVENT',
  custom: 'BIZ',
}

export function CustomerPublicPage() {
  const { businessId, businessSlug } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<PublicBusiness | null>(null)
  const [services, setServices] = useState<Awaited<ReturnType<typeof getBusinessServices>>>([])
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getBusinessMembershipPlans>>>([])

  const load = useCallback(async () => {
    if (!businessId && !businessSlug) return
    const publicBusiness = businessSlug
      ? await getPublicBusinessBySlug(businessSlug)
      : await getPublicBusiness(businessId ?? '')

    if (!publicBusiness) {
      setBusiness(null)
      return
    }

    const [svc, pl] = await Promise.all([
      getBusinessServices(publicBusiness.id),
      getBusinessMembershipPlans(publicBusiness.id),
    ])
    setBusiness(publicBusiness)
    setServices(svc)
    setPlans(pl)
  }, [businessId, businessSlug])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white p-6 dark:from-teal-950 dark:to-slate-950">
        <div className="text-center text-slate-400">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-teal-100 dark:bg-teal-900" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const icon = BUSINESS_ICONS[business.business_type] ?? 'BIZ'
  const portalBase = businessSlug ? `/b/${businessSlug}` : `/customer/${business.id}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-teal-950 dark:to-slate-950">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-base font-semibold shadow-lg dark:bg-slate-800">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              icon
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">{business.business_type.replace('_', ' ')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate(`${portalBase}/book`)} variant="default" className="bg-teal-700 hover:bg-teal-800">
              Book now <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button onClick={() => navigate(`${portalBase}/login`)} variant="outline">
              Sign in
            </Button>
            <Button onClick={() => navigate(`${portalBase}/register`)} variant="outline">
              Register
            </Button>
          </div>
        </div>

        {business.address && (
          <Card className="mb-4">
            <CardContent className="flex items-center gap-3 pt-4 text-sm">
              <MapPin className="h-5 w-5 shrink-0 text-teal-600" />
              <span>{business.address}</span>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex gap-3">
          {business.phone && (
            <a href={`tel:${business.phone}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-medium shadow-sm dark:bg-slate-800">
              <Phone className="h-4 w-4 text-teal-600" /> Call
            </a>
          )}
          {business.whatsapp && (
            <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-medium shadow-sm dark:bg-slate-800">
              WhatsApp
            </a>
          )}
        </div>

        {services.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Our services</h2>
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-slate-400">{service.duration_minutes} min</p>
                    </div>
                  </div>
                  <p className="font-semibold text-teal-700 dark:text-teal-300">RM {service.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {plans.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Memberships</h2>
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="border-teal-100 dark:border-teal-900">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-teal-600" />
                          <h3 className="font-semibold">{plan.name}</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-teal-700 dark:text-teal-300">RM {plan.price}</p>
                        <p className="text-[10px] text-slate-400">/{plan.duration_days} days</p>
                      </div>
                    </div>
                    {plan.credit_amount > 0 && <p className="mt-2 text-xs text-slate-500">RM {plan.credit_amount} credit included</p>}
                    {plan.visit_limit && <p className="text-xs text-slate-500">{plan.visit_limit} visits</p>}
                    {plan.points_bonus > 0 && <p className="text-xs text-slate-500">{plan.points_bonus} bonus points</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-400">
          <p>Powered by Luxantara Members</p>
        </div>
      </div>
    </div>
  )
}
