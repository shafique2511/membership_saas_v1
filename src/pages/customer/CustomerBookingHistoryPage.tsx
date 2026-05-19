import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { customerCancelBooking, customerRescheduleBooking, getCustomerBookings, type CustomerBooking } from '@/services/customerPortal'
import { getAvailableSlots, type AvailableSlot } from '@/services/bookings'
import { Calendar, Clock, RotateCcw, X } from 'lucide-react'
import { useCustomerAccount } from '@/hooks/useCustomerAccount'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-slate-100 text-slate-500',
}

export function CustomerBookingHistoryPage() {
  const { businessId, customerId } = useCustomerAccount()

  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState('')
  const [rescheduleBooking, setRescheduleBooking] = useState<CustomerBooking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().slice(0, 10))
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [rescheduling, setRescheduling] = useState(false)

  const load = useCallback(async () => {
    if (!customerId) return
    const b = await getCustomerBookings(customerId)
    setBookings(b)
  }, [customerId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking?')) return
    try {
      await customerCancelBooking(id, 'Cancelled by customer')
      setMessage('Booking cancelled.')
      await load()
    } catch (err) {
      setMessage(String(err))
    }
  }

  async function openReschedule(booking: CustomerBooking) {
    setRescheduleBooking(booking)
    setRescheduleDate(booking.booking_date)
    setSelectedSlot(null)
    if (!businessId) return
    const slots = await getAvailableSlots(businessId, booking.booking_date, {
      service_id: booking.service_id ?? undefined,
      staff_id: booking.staff_id ?? undefined,
      resource_id: booking.resource_id ?? undefined,
    }).catch(() => [])
    setRescheduleSlots(slots)
  }

  async function handleRescheduleDateChange(date: string) {
    setRescheduleDate(date)
    setSelectedSlot(null)
    if (!businessId || !rescheduleBooking) return
    const slots = await getAvailableSlots(businessId, date, {
      service_id: rescheduleBooking.service_id ?? undefined,
      staff_id: rescheduleBooking.staff_id ?? undefined,
      resource_id: rescheduleBooking.resource_id ?? undefined,
    }).catch(() => [])
    setRescheduleSlots(slots)
  }

  async function handleRescheduleConfirm() {
    if (!rescheduleBooking || !selectedSlot) return
    setRescheduling(true)
    try {
      await customerRescheduleBooking({
        bookingId: rescheduleBooking.id,
        bookingDate: rescheduleDate,
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time,
        staffId: selectedSlot.staff_id ?? rescheduleBooking.staff_id,
        resourceId: selectedSlot.resource_id ?? rescheduleBooking.resource_id,
      })
      setMessage('Booking rescheduled and sent for confirmation.')
      setRescheduleBooking(null)
      await load()
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err))
    } finally {
      setRescheduling(false)
    }
  }

  const filteredBookings = filter ? bookings.filter((b) => b.status === filter) : bookings
  const upcoming = filteredBookings.filter((b) => !['cancelled', 'no_show', 'completed'].includes(b.status))
  const past = filteredBookings.filter((b) => ['cancelled', 'no_show', 'completed'].includes(b.status))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">My bookings</h2>

      {message && (
        <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-700">{message}</div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {['', 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Upcoming</p>
          {upcoming.map((b) => (
            <Card key={b.id} className="border-l-4 border-l-teal-500">
              <CardContent className="pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{b.service_name ?? 'Booking'}</p>
                    <p className="text-xs text-slate-500">{b.branch_name ?? ''}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(b.booking_date).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' '}{b.start_time?.substring(0, 5)}-{b.end_time?.substring(0, 5)}
                    </div>
                    {b.total_amount > 0 && <p className="mt-1 text-xs text-slate-500">RM {b.total_amount.toFixed(2)}</p>}
                    {b.deposit_amount > 0 && <p className="mt-1 text-xs text-amber-600">Deposit required: RM {b.deposit_amount.toFixed(2)}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[b.status] ?? ''}`}>
                      {b.status}
                    </span>
                    {['pending', 'confirmed'].includes(b.status) && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openReschedule(b)} className="h-6 text-teal-600">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(b.id)} className="h-6 text-red-500">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Past</p>
          {past.map((b) => (
            <Card key={b.id}>
              <CardContent className="pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{b.service_name ?? 'Booking'}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(b.booking_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' '}{b.start_time?.substring(0, 5)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <Calendar className="mx-auto mb-2 h-10 w-10" />
            No bookings yet.
          </CardContent>
        </Card>
      )}

      {rescheduleBooking && (
        <Card className="border-teal-200 dark:border-teal-800">
          <CardContent className="space-y-4 pt-4">
            <div>
              <h3 className="font-semibold">Reschedule booking</h3>
              <p className="text-sm text-slate-500">{rescheduleBooking.service_name ?? 'Booking'} at {rescheduleBooking.start_time?.substring(0, 5)}</p>
            </div>
            <input
              type="date"
              value={rescheduleDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => void handleRescheduleDateChange(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            {rescheduleSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {rescheduleSlots.map((slot) => (
                  <button
                    key={`${slot.start_time}-${slot.staff_id ?? ''}-${slot.resource_id ?? ''}`}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border p-2 text-center text-sm font-medium ${
                      selectedSlot?.start_time === slot.start_time ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Clock className="mx-auto mb-1 h-3 w-3" />
                    {slot.start_time?.substring(0, 5)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">No available slots for this date.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setRescheduleBooking(null)}>Close</Button>
              <Button disabled={!selectedSlot || rescheduling} onClick={() => void handleRescheduleConfirm()}>
                {rescheduling ? 'Saving...' : 'Confirm'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
