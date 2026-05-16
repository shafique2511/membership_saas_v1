import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Badge } from '@/components/ui/badge'
import { StaffTabs } from '@/pages/business/staff/StaffTabs'
import { getStaff, getStaffAppointments, type Staff } from '@/services/staff'

export function StaffCalendarPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [staff, setStaff] = useState<(Staff & { branches?: { name: string }[] })[]>([])
  const [appointments, setAppointments] = useState<Record<string, Record<string, unknown>[]>>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getStaff(businessId, { status: 'active' }) as (Staff & { branches?: { name: string }[] })[]
    setStaff(s)

    const dateFrom = selectedDate
    const dateTo = viewMode === 'week'
      ? new Date(new Date(selectedDate).getTime() + 6 * 86400000).toISOString().slice(0, 10)
      : selectedDate

    const all: Record<string, Record<string, unknown>[]> = {}
    for (const member of s) {
      all[member.id] = await getStaffAppointments(member.id, dateFrom, dateTo) as Record<string, unknown>[]
    }
    setAppointments(all)
  }, [businessId, selectedDate, viewMode])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  const dates = viewMode === 'week'
    ? Array.from({ length: 7 }, (_, i) => {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
    : [selectedDate]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Staff calendar</h2>
          <p className="text-sm text-slate-500">View staff appointments by date.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <button onClick={() => setViewMode('day')} className={`rounded-full px-3 py-1 text-xs font-medium ${viewMode === 'day' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Day</button>
            <button onClick={() => setViewMode('week')} className={`rounded-full px-3 py-1 text-xs font-medium ${viewMode === 'week' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Week</button>
          </div>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </div>
      </div>
      <StaffTabs />

      <div className="overflow-x-auto">
        <div className="flex gap-4" style={{ minWidth: dates.length * 250 }}>
          {dates.map((date) => (
            <div key={date} className="flex-1">
              <p className="mb-2 text-center text-xs font-medium text-slate-500">
                {new Date(date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <div className="space-y-2">
                {staff.filter((s) => s.status === 'active').map((member) => {
                  const dayApps = (appointments[member.id] ?? []).filter((a) => String(a.booking_date) === date)
                  return (
                    <div key={member.id} className="rounded-md border border-slate-100 p-2 dark:border-slate-800">
                      <p className="mb-1 text-xs font-medium text-slate-500">{member.full_name}</p>
                      {dayApps.length === 0 ? (
                        <p className="text-xs text-slate-300">—</p>
                      ) : (
                        dayApps.map((a) => (
                          <div key={String(a.id)} className="mb-1 rounded bg-teal-50 p-1 text-xs dark:bg-teal-900/30">
                            <span className="font-medium">{String(a.start_time)}</span>
                            <span className="ml-1">{(() => {
                              const c = a.customers ? (Array.isArray(a.customers) ? a.customers[0] : a.customers) : null
                              return (c as { full_name?: string })?.full_name ?? '-'
                            })()}</span>
                            <Badge className="ml-1" variant="muted">{String(a.status)}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
