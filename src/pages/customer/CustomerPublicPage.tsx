import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPublicBusiness, getBusinessServices, getBusinessMembershipPlans, type PublicBusiness } from '@/services/customerPortal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Scissors, Sparkles, ArrowRight } from 'lucide-react'

const BUSINESS_ICONS: Record<string, string> = {
  barber_shop: '✂️',
  coffee_shop: '☕',
  salon: '💇',
  spa: '🧖',
  clinic: '🏥',
  event_space: '🎉',
  custom: '✨',
}

export function CustomerPublicPage() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<PublicBusiness | null>(null)
  const [services, setServices] = useState<Awaited<ReturnType<typeof getBusinessServices>>>([])
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getBusinessMembershipPlans>>>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const [b, svc, pl] = await Promise.all([
      getPublicBusiness(businessId),
      getBusinessServices(businessId),
      getBusinessMembershipPlans(businessId),
    ])
    setBusiness(b)
    setServices(svc)
    setPlans(pl)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!business) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white p-6 dark:from-teal-950 dark:to-slate-950">
      <div className="text-center text-slate-400">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-teal-100 dark:bg-teal-900" />
        <p>Loading...</p>
      </div>
    </div>
  )

  const icon = BUSINESS_ICONS[business.business_type] ?? '✨'

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-teal-950 dark:to-slate-950">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-lg dark:bg-slate-800">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              icon
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm text-slate-500 capitalize">{business.business_type.replace('_', ' ')}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => navigate(`/auth/customer-register?business=${businessId}`)} variant="default" className="bg-teal-700 hover:bg-teal-800">
              Register <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button onClick={() => navigate(`/auth/login?business=${businessId}`)} variant="outline">
              Sign in
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
              <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp
            </a>
          )}
        </div>

        {services.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Our services</h2>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.duration_minutes} min</p>
                    </div>
                  </div>
                  <p className="font-semibold text-teal-700 dark:text-teal-300">RM {s.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {plans.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Memberships</h2>
            <div className="space-y-3">
              {plans.map((p) => (
                <Card key={p.id} className="border-teal-100 dark:border-teal-900">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-teal-600" />
                          <h3 className="font-semibold">{p.name}</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{p.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-teal-700 dark:text-teal-300">RM {p.price}</p>
                        <p className="text-[10px] text-slate-400">/{p.duration_days} days</p>
                      </div>
                    </div>
                    {p.credit_amount > 0 && <p className="mt-2 text-xs text-slate-500">RM {p.credit_amount} credit included</p>}
                    {p.visit_limit && <p className="text-xs text-slate-500">{p.visit_limit} visits</p>}
                    {p.points_bonus > 0 && <p className="text-xs text-slate-500">{p.points_bonus} bonus points</p>}
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
