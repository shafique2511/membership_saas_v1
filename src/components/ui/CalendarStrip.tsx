import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CalendarStripProps {
  selectedDate: string
  onDateChange: (date: string) => void
  days?: number
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + days)
  const nextYear = next.getFullYear()
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0')
  const nextDay = String(next.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function CalendarStrip({ selectedDate, onDateChange, days = 7 }: CalendarStripProps) {
  const dates = Array.from({ length: days }, (_, index) => addDays(selectedDate, index - Math.floor(days / 2)))

  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" onClick={() => onDateChange(addDays(selectedDate, -1))} aria-label="Previous day">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {dates.map((date) => {
          const parsed = parseLocalDate(date)
          const active = date === selectedDate
          return (
            <button
              key={date}
              type="button"
              onClick={() => onDateChange(date)}
              className={cn(
                'min-w-16 rounded-lg border px-3 py-2 text-center text-sm transition-colors',
                active
                  ? 'border-slate-950 bg-slate-950 text-white dark:border-emerald-300 dark:bg-emerald-300 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              <span className="block text-[11px]">{parsed.toLocaleDateString('en', { weekday: 'short' })}</span>
              <span className="block font-semibold">{parsed.getDate()}</span>
            </button>
          )
        })}
      </div>
      <Button size="icon" variant="outline" onClick={() => onDateChange(addDays(selectedDate, 1))} aria-label="Next day">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
