import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { StatItem } from '@/types'

export function StatCard({ label, value, hint, trend, icon: Icon }: StatItem) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          {Icon ? (
            <span className="rounded-md bg-teal-50 p-2 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
          </div>
          {trend ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              <ArrowUpRight className="h-3 w-3" />
              {trend}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
