import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getCustomerBookings, type CustomerBooking } from '@/services/customerPortal'
import { cancelBooking } from '@/services/bookings'
import { Calendar, X } from 'lucide-react'

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
  const { profile } = useAppContext()
  const customerId = profile?.id ?? ''

  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!customerId) return
    const b = await getCustomerBookings(customerId)
    setBookings(b)
  }, [customerId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking?')) return
    try {
      await cancelBooking(id, 'Cancelled by customer')
      setMessage('Booking cancelled.')
      await load()
    } catch (err) {
      setMessage(String(err))
    }
  }

  const upcoming = bookings.filter((b) => !['cancelled', 'no_show', 'completed'].includes(b.status))
  const past = bookings.filter((b) => ['cancelled', 'no_show', 'completed'].includes(b.status))

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
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[b.status] ?? ''}`}>
                      {b.status}
                    </span>
                    {['pending', 'confirmed'].includes(b.status) && (
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(b.id)} className="h-6 text-red-500">
                        <X className="h-3 w-3" />
                      </Button>
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
    </div>
  )
}
