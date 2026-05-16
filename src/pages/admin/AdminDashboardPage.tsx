import { Building2, CreditCard, Package, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Super admin" description="Platform-level controls for tenants, packages, modules, and billing." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Businesses" value="42" hint="Across all packages" icon={Building2} />
        <StatCard label="Active modules" value="14" hint="Global module catalog" icon={Package} />
        <StatCard label="Monthly billing" value="RM 38k" hint="Manual tracking ready" icon={CreditCard} />
        <StatCard label="Security" value="RLS ready" hint="Policies arrive in Phase 2" icon={ShieldCheck} />
      </div>
      <EmptyState
        title="Admin management pages are scaffolded"
        description="Detailed package, module, subscription, and audit workflows will be implemented in Phase 5."
      />
    </div>
  )
}
