import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  className?: string
}

export function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onOpenChange,
  className,
}: DialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4">
      <div
        className={cn(
          'flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-xl border border-slate-200 bg-white shadow-xl sm:rounded-lg dark:border-slate-800 dark:bg-slate-900',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:p-5 dark:border-slate-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
