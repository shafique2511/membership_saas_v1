import { PageHeader } from '@/components/layout/PageHeader'
import { PackageComparison } from '@/components/modules/PackageComparison'

export function PackageComparisonPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Package comparison" description="Package-based selling matrix for modules, access levels, and limits." />
      <PackageComparison />
    </div>
  )
}
