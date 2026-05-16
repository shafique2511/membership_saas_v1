import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarketingTabs } from './MarketingTabs'
import { getSegments, createSegment, deleteSegment, calculateSegmentCount, recalculateAllSegments, SEGMENT_TYPES, type CustomerSegment } from '@/services/marketing'

const segmentLabels: Record<string, string> = {
  new_customers: 'New Customers (last 30 days)',
  active_members: 'Active Members',
  expiring_members: 'Expiring Members (30 days)',
  vip_customers: 'VIP Customers',
  inactive_customers: 'Inactive (90 days)',
  birthday_month: 'Birthday This Month',
  high_spenders: 'High Spenders',
  no_show_customers: 'No-Show Customers',
  by_service: 'By Service Used',
}

export function SegmentsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [calculating, setCalculating] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getSegments(businessId)
    setSegments(s)
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function handleCreate(type: string) {
    const name = segmentLabels[type] ?? type.replace(/_/g, ' ')
    await createSegment(businessId, { name, segment_type: type, customer_count: 0 })
    await load()
  }

  async function handleDelete(id: string) {
    await deleteSegment(id)
    await load()
  }

  async function handleCalculate(id: string, type: string) {
    setCalculating(id)
    const count = await calculateSegmentCount(businessId, type)
    setSegments((prev) => prev.map((s) => s.id === id ? { ...s, customer_count: count, last_calculated_at: new Date().toISOString() } : s))
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
          <p className="text-sm text-slate-500">Define and manage customer segments for targeting.</p>
        </div>
        <Button variant="outline" onClick={handleRecalculateAll}>Recalculate all</Button>
      </div>
      <MarketingTabs />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SEGMENT_TYPES.map((type) => {
          const existing = segments.find((s) => s.segment_type === type)
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
                      <Button size="sm" variant="outline" onClick={() => handleCalculate(existing.id, type)} disabled={calculating === existing.id}>
                        {calculating === existing.id ? '...' : 'Count'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(existing.id)}>Remove</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Not created yet</p>
                    <Button size="sm" variant="outline" onClick={() => handleCreate(type)}>Create segment</Button>
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
