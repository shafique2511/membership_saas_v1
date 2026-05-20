import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Headphones, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getModuleUpgradeInfo } from '@/services/upgradeCatalog'
import type { ModuleKey } from '@/types'

interface UpgradePromptProps {
  moduleKey?: ModuleKey
  moduleName: string
  packageName?: string
}

export function UpgradePrompt({ moduleKey, moduleName, packageName }: UpgradePromptProps) {
  const upgradeInfo = moduleKey ? getModuleUpgradeInfo(moduleKey, moduleName) : null
  const requiredPackage = packageName ?? upgradeInfo?.requiredPackage.name ?? 'Growth or higher'
  const benefits = upgradeInfo?.benefits ?? [
    'Unlock this workflow for your team',
    'Use the feature without leaving the dashboard',
    'Keep permissions and package limits enforced',
  ]

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">Locked module</p>
            <h3 className="mt-1 font-semibold">{moduleName} is locked</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {requiredPackage} unlocks {moduleName}. Upgrade the plan or request an add-on to turn this into an active workflow.
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Link to="/business/packages">
              <Button className="w-full" variant="outline">
                Compare Packages
              </Button>
            </Link>
            <Link to="/contact">
              <Button className="w-full" variant="outline">
                <Headphones className="h-4 w-4" />
                Contact Support
              </Button>
            </Link>
            <Link to={`/business/upgrade?module=${moduleKey ?? ''}`}>
              <Button className="w-full">
                Upgrade Plan
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
