import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PackageComparison } from '@/components/modules/PackageComparison'

export function UpgradePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Upgrade package"
        description="Compare packages, module levels, and usage limits before changing plans."
        actions={<Button>Upgrade Plan</Button>}
      />
      <PackageComparison />
    </div>
  )
}
