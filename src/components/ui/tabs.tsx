import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabItem {
  value: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  items: TabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onValueChange(item.value)}
          className={cn(
            'inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium text-slate-600 transition-colors dark:text-slate-300',
            value === item.value
              ? 'bg-slate-950 text-white shadow-sm dark:bg-emerald-300 dark:text-slate-950'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}
