import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'muted'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  muted: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
