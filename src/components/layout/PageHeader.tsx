import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </div>
  )
}
