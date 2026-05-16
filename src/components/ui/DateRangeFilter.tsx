import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface DateRangeFilterProps {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input type="date" value={from ?? ''} className="pl-9" onChange={(event) => onChange({ from: event.target.value, to })} />
      </label>
      <label className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input type="date" value={to ?? ''} className="pl-9" onChange={(event) => onChange({ from, to: event.target.value })} />
      </label>
    </div>
  )
}
