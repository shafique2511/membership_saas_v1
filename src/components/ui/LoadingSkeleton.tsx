import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'list' | 'detail'
  count?: number
  className?: string
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)} />
}

export function LoadingSkeleton({ variant = 'card', count = 3, className }: LoadingSkeletonProps) {
  if (variant === 'table') {
    return (
      <div className={cn('space-y-3', className)}>
        <SkeletonBar className="h-10 w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBar key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBar className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBar className="h-4 w-3/5" />
              <SkeletonBar className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className={cn('space-y-6', className)}>
        <SkeletonBar className="h-8 w-64" />
        <SkeletonBar className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonBar key={i} className="h-28" />
          ))}
        </div>
        <SkeletonBar className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SkeletonBar className="mb-3 h-4 w-24" />
          <SkeletonBar className="mb-2 h-8 w-20" />
          <SkeletonBar className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
