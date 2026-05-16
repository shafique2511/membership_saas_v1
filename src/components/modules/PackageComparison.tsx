import { Check, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { moduleLabels, packageCatalog } from '@/services/packageCatalog'
import type { ModuleKey } from '@/types'

const allModules = Object.keys(moduleLabels) as ModuleKey[]

function formatLimit(value: number | string | boolean | undefined) {
  if (value === undefined) {
    return 'Not included'
  }

  if (typeof value === 'boolean') {
    return value ? 'Included' : 'Not included'
  }

  return typeof value === 'number' ? value.toLocaleString() : value
}

export function PackageComparison() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        {packageCatalog.map((item) => (
          <Card key={item.key}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
              <p className="text-sm text-slate-500">{item.summary}</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.monthlyPrice}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>Customers: {formatLimit(item.limits.customers)}</p>
                <p>Staff: {formatLimit(item.limits.staff)}</p>
                <p>Branches: {formatLimit(item.limits.branches)}</p>
                <p>Bookings/month: {formatLimit(item.limits.bookingsPerMonth)}</p>
                <p>WhatsApp/month: {formatLimit(item.limits.whatsappMessagesPerMonth)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left">Module</th>
              {packageCatalog.map((item) => (
                <th key={item.key} className="px-4 py-3 text-left">
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {allModules.map((moduleKey) => (
              <tr key={moduleKey}>
                <td className="px-4 py-3 font-medium">{moduleLabels[moduleKey]}</td>
                {packageCatalog.map((item) => {
                  const rule = item.modules.find((moduleRule) => moduleRule.module === moduleKey)
                  return (
                    <td key={item.key} className="px-4 py-3">
                      {rule ? (
                        <Badge>
                          <Check className="mr-1 h-3 w-3" />
                          {rule.access}
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center text-slate-400">
                          <Minus className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
