import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'

const packages = ['Starter', 'Growth', 'Pro', 'Business Suite', 'Enterprise']

export function UpgradePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Upgrade package" description="Unlock modules, raise usage limits, and add premium workflows." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {packages.map((name) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle>{name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="min-h-16 text-sm text-slate-500 dark:text-slate-400">
                Package rules and module limits will be connected in Phase 4.
              </p>
              <Button className="mt-4 w-full" variant={name === 'Starter' ? 'secondary' : 'default'}>
                {name === 'Starter' ? 'Current plan' : 'Review'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
