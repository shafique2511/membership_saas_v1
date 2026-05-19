import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { MarketingTabs } from './MarketingTabs'
import {
  SEGMENT_TYPES,
  calculateSegmentCount,
  createSegment,
  deleteSegment,
  getMarketingTargetOptions,
  getSegments,
  recalculateAllSegments,
  type CustomerSegment,
  type MarketingTargetOption,
} from '@/services/marketing'

const segmentLabels: Record<string, string> = {
  new_customers: 'New Customers',
  active_members: 'Active Members',
  expiring_members: 'Expiring Members',
  vip_customers: 'VIP Customers',
  inactive_customers: 'Inactive Customers',
  birthday_month: 'Birthday This Month',
  high_spenders: 'High Spenders',
  no_show_customers: 'No-show Customers',
  by_service: 'Customers by Service Used',
}

const segmentDescriptions: Record<string, string> = {
  new_customers: 'Customers created during the selected recent period.',
  active_members: 'Customers with active memberships.',
  expiring_members: 'Active memberships ending within the configured days.',
  vip_customers: 'Customers with a VIP membership or high spending.',
  inactive_customers: 'Customers without a booking in the configured days.',
  birthday_month: 'Customers with a birthday in the current month.',
  high_spenders: 'Customers whose total spend meets the configured threshold.',
  no_show_customers: 'Customers with no-show bookings in the configured days.',
  by_service: 'Customers who booked a selected service.',
}

function defaultCriteria(type: string, serviceId = ''): Record<string, unknown> {
  if (type === 'new_customers') return { days: 30 }
  if (type === 'expiring_members') return { days: 30 }
  if (type === 'inactive_customers') return { days: 90 }
  if (type === 'no_show_customers') return { days: 90 }
  if (type === 'high_spenders') return { min_spend: 1000 }
  if (type === 'vip_customers') return { min_spend: 1000 }
  if (type === 'by_service') return { service_id: serviceId }
  return {}
}

export function SegmentsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [services, setServices] = useState<MarketingTargetOption[]>([])
  const [calculating, setCalculating] = useState<string | null>(null)
  const [serviceId, setServiceId] = useState('')
  const [days, setDays] = useState(30)
  const [minSpend, setMinSpend] = useState(1000)

  const load = useCallback(async () => {
    if (!businessId) return
    const [segmentRows, options] = await Promise.all([getSegments(businessId), getMarketingTargetOptions(businessId)])
    setSegments(segmentRows)
    setServices(options.filter((option) => option.type === 'service'))
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  function criteriaFor(type: string) {
    const criteria = defaultCriteria(type, serviceId)
    if (type === 'new_customers' || type === 'expiring_members' || type === 'inactive_customers' || type === 'no_show_customers') {
      criteria.days = days
    }
    if (type === 'high_spenders' || type === 'vip_customers') {
      criteria.min_spend = minSpend
    }
    return criteria
  }

  async function handleCreate(type: string) {
    const criteria = criteriaFor(type)
    if (type === 'by_service' && !criteria.service_id) return
    const serviceName = type === 'by_service' ? services.find((service) => service.id === serviceId)?.name : null
    const name = type === 'by_service' && serviceName ? `${segmentLabels[type]} - ${serviceName}` : segmentLabels[type] ?? type.replace(/_/g, ' ')
    const count = await calculateSegmentCount(businessId, type, criteria)
    await createSegment(businessId, { name, segment_type: type, criteria, customer_count: count, last_calculated_at: new Date().toISOString() })
    await load()
  }

  async function handleDelete(id: string) {
    await deleteSegment(id)
    await load()
  }

  async function handleCalculate(segment: CustomerSegment) {
    setCalculating(segment.id)
    const count = await calculateSegmentCount(businessId, segment.segment_type, segment.criteria)
    setSegments((prev) => prev.map((item) => item.id === segment.id ? { ...item, customer_count: count, last_calculated_at: new Date().toISOString() } : item))
    setCalculating(null)
  }

  async function handleRecalculateAll() {
    await recalculateAllSegments(businessId)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Customer Segments</h2>
          <p className="text-sm text-slate-500">Create targeting groups for campaigns and broadcasts.</p>
        </div>
        <Button variant="outline" onClick={handleRecalculateAll}>Recalculate all</Button>
      </div>
      <MarketingTabs />

      <Card>
        <CardHeader><CardTitle>Segment criteria</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Days window" description="Used by new, inactive, expiring, and no-show segments.">
            <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </Field>
          <Field label="High spender threshold" description="Minimum total spent for high spender and VIP segments.">
            <Input type="number" value={minSpend} onChange={(e) => setMinSpend(Number(e.target.value))} />
          </Field>
          <Field label="Service" description="Used by the customers by service segment.">
            <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select service</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
          </Field>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SEGMENT_TYPES.map((type) => {
          const existing = segments.find((segment) => segment.segment_type === type && (type !== 'by_service' || segment.criteria?.service_id === serviceId))
          const disabled = type === 'by_service' && !serviceId
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{segmentLabels[type] ?? type.replace(/_/g, ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                {existing ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{existing.customer_count}</p>
                    <p className="text-xs text-muted-foreground">
                      {existing.last_calculated_at ? `Last: ${new Date(existing.last_calculated_at).toLocaleDateString()}` : 'Not calculated'}
                    </p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleCalculate(existing)} disabled={calculating === existing.id}>
                        {calculating === existing.id ? 'Counting...' : 'Count'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(existing.id)}>Remove</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{segmentDescriptions[type]}</p>
                    <Button size="sm" variant="outline" onClick={() => handleCreate(type)} disabled={disabled}>Create segment</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
