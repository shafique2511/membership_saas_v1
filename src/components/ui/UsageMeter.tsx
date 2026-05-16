import { cn } from '@/lib/utils'

interface UsageMeterProps {
  used: number
  limit: number
  label?: string
  showPercentage?: boolean
  className?: string
}

export function UsageMeter({ used, limit, label, showPercentage, className }: UsageMeterProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isWarning = percentage >= 80
  const isDanger = percentage >= 95

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-slate-500">{label}</span>}
          {showPercentage && (
            <span className={cn('font-medium', isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500')}>
              {used}/{limit} ({Math.round(percentage)}%)
            </span>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!showPercentage && (
        <p className="text-[10px] text-slate-400">
          {used}/{limit} used
        </p>
      )}
    </div>
  )
}
