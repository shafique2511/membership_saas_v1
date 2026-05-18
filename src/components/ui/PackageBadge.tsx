import { Badge, type BadgeVariant } from '@/components/ui/badge'

interface PackageBadgeProps {
  packageName?: string | null
  status?: string | null
}

const statusVariant: Record<string, BadgeVariant> = {
  active: 'success',
  trialing: 'warning',
  past_due: 'warning',
  cancelled: 'danger',
  expired: 'danger',
}

export function PackageBadge({ packageName, status }: PackageBadgeProps) {
  const normalizedStatus = String(status ?? 'active').toLowerCase()
  return (
    <Badge variant={statusVariant[normalizedStatus] ?? 'muted'}>
      {packageName || 'No package'}
      {status ? ` - ${status.replaceAll('_', ' ')}` : ''}
    </Badge>
  )
}
