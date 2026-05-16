import { LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface UpgradePromptProps {
  moduleName: string
  packageName?: string
}

export function UpgradePrompt({ moduleName, packageName = 'Growth or higher' }: UpgradePromptProps) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold">{moduleName} is locked</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Upgrade to {packageName} or enable an add-on to use this module.
            </p>
          </div>
        </div>
        <Button variant="secondary">View packages</Button>
      </CardContent>
    </Card>
  )
}
