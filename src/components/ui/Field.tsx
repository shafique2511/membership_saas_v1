import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  description?: string
  htmlFor?: string
  className?: string
  children: ReactNode
}

export function Field({ label, description, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {description ? (
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {children}
    </div>
  )
}
