import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { useAppContext } from '@/context/useAppContext'
import { moduleLabels } from '@/services/packageCatalog'
import { getUsageCounters, type UsageCounterRow } from '@/services/packageSystem'

function UsageMeter({ row }: { row: UsageCounterRow }) {
  const percent = row.limit_count ? Math.min(100, Math.round((row.used_count / row.limit_count) * 100)) : 0

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{row.usage_key.replaceAll('_', ' ')}</p>
            <p className="mt-1 text-sm text-slate-500">{moduleLabels[row.module_key]} module</p>
          </div>
          <p className="text-sm font-semibold">
            {row.used_count.toLocaleString()} / {row.limit_count?.toLocaleString() ?? 'Unlimited'}
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-teal-700 dark:bg-teal-300" style={{ width: `${row.limit_count ? percent : 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {row.period_start} to {row.period_end}
        </p>
      </CardContent>
    </Card>
  )
}

export function UsageLimitsPage() {
  const { profile } = useAppContext()
  const [usageRows, setUsageRows] = useState<UsageCounterRow[]>([])

  useEffect(() => {
    if (!profile?.business_id) {
      return
    }

    void getUsageCounters(profile.business_id).then(setUsageRows)
  }, [profile?.business_id])

  return (
    <div className="space-y-6">
      <PageHeader title="Usage limits" description="Track package usage and enforce package limits before writes happen." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {usageRows.length ? (
          usageRows.map((row) => <UsageMeter key={row.id} row={row} />)
        ) : (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              Usage counters will populate as bookings, customers, staff, branches, and notifications are created.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
