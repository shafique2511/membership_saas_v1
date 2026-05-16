import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
}

const successStatuses = ['active', 'paid', 'confirmed', 'completed', 'enabled']
const warningStatuses = ['pending', 'draft', 'scheduled', 'expiring']
const dangerStatuses = ['cancelled', 'failed', 'expired', 'disabled', 'no_show']

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase()
  const variant = successStatuses.includes(normalized)
    ? 'success'
    : warningStatuses.includes(normalized)
      ? 'warning'
      : dangerStatuses.includes(normalized)
        ? 'danger'
        : 'muted'

  return <Badge variant={variant}>{status.replaceAll('_', ' ')}</Badge>
}
