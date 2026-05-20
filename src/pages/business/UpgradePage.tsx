import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, Headphones, LockKeyhole, Puzzle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PackageComparison } from '@/components/modules/PackageComparison'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppContext } from '@/context/useAppContext'
import { moduleLabels } from '@/services/packageCatalog'
import { getAddons, getBusinessModuleAccess, getBusinessSubscription, getUsageCounters, type ModuleAccessRow, type UsageCounterRow } from '@/services/packageSystem'
import { getLockedModules, getModuleUpgradeInfo } from '@/services/upgradeCatalog'
import type { ModuleKey } from '@/types'

function formatPackageName(subscription: Record<string, unknown> | null) {
  const packageData = subscription?.packages as { name?: string } | undefined
  return packageData?.name ?? 'Starter'
}

function UsageSummary({ rows }: { rows: UsageCounterRow[] }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No usage counters yet"
        description="Usage will appear after bookings, customers, staff, branches, and notification activity are recorded."
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {rows.slice(0, 4).map((row) => (
        <Card key={row.id}>
          <CardContent className="p-4">
            <p className="text-sm font-medium capitalize">{row.usage_key.replaceAll('_', ' ')}</p>
            <p className="mt-2 text-2xl font-semibold">
              {row.used_count.toLocaleString()}
              <span className="text-sm font-normal text-slate-500"> / {row.limit_count?.toLocaleString() ?? 'Unlimited'}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">{moduleLabels[row.module_key]} module</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function UpgradePage() {
  const { enabledModules, profile } = useAppContext()
  const [searchParams] = useSearchParams()
  const requestedModule = searchParams.get('module') as ModuleKey | null
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null)
  const [usageRows, setUsageRows] = useState<UsageCounterRow[]>([])
  const [moduleAccess, setModuleAccess] = useState<ModuleAccessRow[]>([])
  const [addons, setAddons] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    if (!profile?.business_id) {
      return
    }

    void Promise.all([
      getBusinessSubscription(profile.business_id),
      getUsageCounters(profile.business_id),
      getBusinessModuleAccess(profile.business_id),
      getAddons(profile.business_id),
    ]).then(([nextSubscription, nextUsageRows, nextModuleAccess, nextAddons]) => {
      setSubscription(nextSubscription as Record<string, unknown> | null)
      setUsageRows(nextUsageRows)
      setModuleAccess(nextModuleAccess)
      setAddons(nextAddons as Record<string, unknown>[])
    })
  }, [profile?.business_id])

  const lockedModules = useMemo(() => {
    const fromAccessTable = moduleAccess
      .filter((row) => !row.is_enabled || row.access_level === 'none')
      .map((row) => row.module_key)
    const candidates = fromAccessTable.length ? fromAccessTable : getLockedModules(enabledModules).map((item) => item.moduleKey)
    const unique = Array.from(new Set(candidates))
    return unique.map((moduleKey) => ({ moduleKey, ...getModuleUpgradeInfo(moduleKey) }))
  }, [enabledModules, moduleAccess])

  const requestedModuleInfo = requestedModule ? getModuleUpgradeInfo(requestedModule) : null
  const currentPackage = formatPackageName(subscription)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upgrade package"
        description="Turn locked modules into upgrade opportunities with clear package requirements, add-ons, and support options."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/contact">
              <Button variant="outline">
                <Headphones className="h-4 w-4" />
                Contact Support
              </Button>
            </Link>
            <Link to="/business/packages">
              <Button>
                Compare Packages
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/business/subscription">
              <Button>
                Upgrade Plan
              </Button>
            </Link>
          </div>
        }
      />

      {requestedModuleInfo ? (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-200">Selected locked feature</p>
              <h2 className="mt-1 text-lg font-semibold">{requestedModuleInfo.featureName}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Requires {requestedModuleInfo.requiredPackage.name}. Compare packages or contact support to activate it for this business.
              </p>
            </div>
            <Link to="/contact"><Button variant="outline">Contact Support</Button></Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current package</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{currentPackage}</p>
            <div className="mt-3">
              <StatusBadge status={String(subscription?.status ?? 'trial')} />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Billing cycle: {String(subscription?.billing_cycle ?? 'monthly')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locked modules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{lockedModules.length}</p>
            <p className="mt-3 text-sm text-slate-500">
              Each locked module now points to the package or add-on that unlocks it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add-on options</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{addons.length}</p>
            <p className="mt-3 text-sm text-slate-500">
              Active or requested add-ons can unlock modules without a full plan change.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current usage</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageSummary rows={usageRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locked module opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {lockedModules.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lockedModules.map((item) => (
                <div key={item.moduleKey} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                      <LockKeyhole className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{item.featureName}</p>
                      <p className="mt-1 text-sm text-slate-500">Requires {item.requiredPackage.name}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {item.benefits.slice(0, 2).map((benefit) => <li key={benefit}>{benefit}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No locked modules" description="This business already has access to every configured module." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          {addons.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {addons.map((addon) => (
                <div key={String(addon.id)} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{String(addon.name ?? 'Add-on')}</p>
                      <p className="mt-1 text-sm text-slate-500">{moduleLabels[String(addon.module_key) as ModuleKey] ?? String(addon.module_key ?? 'Module')}</p>
                    </div>
                    <Badge>{String(addon.access_level ?? 'addon')}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Expires: {String(addon.end_date ?? 'No expiry')}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active add-ons"
              description="Contact support to enable a module add-on or temporary upgrade for a sales trial."
              icon={Puzzle}
            />
          )}
        </CardContent>
      </Card>

      <PackageComparison />
    </div>
  )
}
