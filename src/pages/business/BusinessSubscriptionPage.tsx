import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppContext } from '@/context/useAppContext'
import { getBusinessSubscription } from '@/services/packageSystem'

export function BusinessSubscriptionPage() {
  const { profile } = useAppContext()
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!profile?.business_id) {
      return
    }

    void getBusinessSubscription(profile.business_id).then((data) => setSubscription(data as Record<string, unknown> | null))
  }, [profile?.business_id])

  const packageData = subscription?.packages as { name?: string; slug?: string } | undefined

  return (
    <div className="space-y-6">
      <PageHeader title="Business subscription" description="Current package, billing status, cycle, and renewal dates." />
      <Card>
        <CardHeader>
          <CardTitle>{packageData?.name ?? 'Starter'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <div className="mt-2">
              <StatusBadge status={String(subscription?.status ?? 'trial')} />
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-500">Billing cycle</p>
            <p className="mt-2 font-medium">{String(subscription?.billing_cycle ?? 'monthly')}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Start date</p>
            <p className="mt-2 font-medium">{String(subscription?.start_date ?? 'Not set')}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Next billing</p>
            <p className="mt-2 font-medium">{String(subscription?.next_billing_date ?? 'Trial period')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
