import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getStaffMember, updateStaff, type Staff } from '@/services/staff'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export function StaffSchedulePage() {
  const { staffId = '' } = useParams()
  const [staff, setStaff] = useState<(Staff & { branches?: { name: string }[] }) | null>(null)
  const [hours, setHours] = useState<Record<string, { start: string; end: string; enabled: boolean }>>({})
  const [offDays, setOffDays] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!staffId) return
    const s = await getStaffMember(staffId) as (Staff & { branches?: { name: string }[] }) | null
    setStaff(s)
    if (s) {
      const wh = (s.working_hours ?? {}) as Record<string, unknown>
      const parsed: Record<string, { start: string; end: string; enabled: boolean }> = {}
      DAYS.forEach((d) => {
        const existing = wh[d] as { start?: string; end?: string } | undefined
        parsed[d] = { start: existing?.start ?? '09:00', end: existing?.end ?? '18:00', enabled: !!existing }
      })
      setHours(parsed)
      setOffDays(Array.isArray(s.off_days) ? s.off_days.map(String) : [])
    }
  }, [staffId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSave() {
    setSaving(true)
    const wh: Record<string, { start: string; end: string }> = {}
    DAYS.forEach((d) => { if (hours[d]?.enabled) wh[d] = { start: hours[d].start, end: hours[d].end } })
    await updateStaff(staffId, { working_hours: wh, off_days: offDays } as Partial<Staff>)
    setSaving(false)
  }

  function toggleDay(day: string) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))
  }

  function toggleOffDay(date: string) {
    setOffDays((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date])
  }

  if (!staff) return <div className="py-20 text-center text-slate-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{staff.full_name} — Schedule</h2>
          <p className="text-sm text-slate-500">Set working hours and off days.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save schedule'}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="text-sm font-semibold">Working hours</h3>
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <label className="flex w-24 items-center gap-2 text-sm">
                  <input type="checkbox" checked={hours[day]?.enabled ?? false} onChange={() => toggleDay(day)} />
                  {day}
                </label>
                {hours[day]?.enabled && (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={hours[day].start} onChange={(e) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))} className="w-28" />
                    <span className="text-xs text-slate-400">to</span>
                    <Input type="time" value={hours[day].end} onChange={(e) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))} className="w-28" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="text-sm font-semibold">Off days</h3>
            <p className="text-xs text-slate-400">Click dates to toggle off days. Format: YYYY-MM-DD</p>
            <Input placeholder="2026-05-20" value="" onChange={(e) => {
              if (e.target.value.length === 10) { toggleOffDay(e.target.value); e.target.value = '' }
            }} />
            <div className="flex flex-wrap gap-1">
              {offDays.map((d) => (
                <button key={d} onClick={() => toggleOffDay(d)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300">
                  {d} ✕
                </button>
              ))}
              {offDays.length === 0 && <p className="text-xs text-slate-400">No off days set.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
