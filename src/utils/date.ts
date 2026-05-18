import { addDays, format, isValid, parseISO } from 'date-fns'

export function formatDate(value: string | Date | null | undefined, pattern = 'dd MMM yyyy') {
  if (!value) return '-'
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, pattern) : '-'
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, 'dd MMM yyyy, h:mm a')
}

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysIso(days: number) {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}
