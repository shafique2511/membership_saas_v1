import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getServices, getStaff, getAvailableSlots, createBooking, type ServiceRow, type StaffRow, type AvailableSlot } from '@/services/bookings'

interface StepProps {
  title: string
  children: React.ReactNode
}

function Step({ title, children }: StepProps) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function CustomerBookingPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const customerId = profile?.id ?? ''

  const [step, setStep] = useState(1)
  const [services, setServices] = useState<ServiceRow[]>([])
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [slots, setSlots] = useState<AvailableSlot[]>([])

  const [selectedService, setSelectedService] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)

  const [customerName, setCustomerName] = useState(profile?.full_name ?? '')
  const [customerPhone, setCustomerPhone] = useState(profile?.phone ?? '')
  const [customerEmail, setCustomerEmail] = useState(profile?.email ?? '')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!businessId) return
    const [svc, stf] = await Promise.all([
      getServices(businessId),
      getStaff(businessId),
    ])
    setServices(svc); setStaffList(stf)
  }, [businessId])

  useEffect(() => { void loadData() }, [loadData])

  useEffect(() => {
    if (!selectedDate || !businessId) return
    void getAvailableSlots(businessId, selectedDate, {
      service_id: selectedService || undefined,
      staff_id: selectedStaff || undefined,
    }).then(setSlots).catch(() => setSlots([]))
  }, [businessId, selectedDate, selectedService, selectedStaff])

  async function handleConfirm() {
    if (!selectedSlot) return
    setLoading(true)
    setError('')
    try {
      let cid = customerId
      if (!cid) {
        return
      }

      await createBooking({
        business_id: businessId,
        customer_id: cid || null,
        staff_id: selectedStaff || null,
        service_id: selectedService || null,
        booking_type: 'appointment',
        booking_date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: notes || null,
      })
      setDone(true)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }

  const selectedServiceData = services.find((s) => s.id === selectedService)

  if (done) {
    return (
      <div className="space-y-6 p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-semibold">Booking confirmed!</h2>
            <p className="mt-2 text-sm text-slate-500">Your appointment has been booked. You can view it in your bookings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="mb-4 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${s === step ? 'bg-teal-700 text-white' : s < step ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
            {s}
          </div>
        ))}
        <div className="ml-2 text-sm font-medium text-slate-500">
          {step === 1 ? 'Choose service' : step === 2 ? 'Choose time' : step === 3 ? 'Your details' : 'Confirm'}
        </div>
      </div>

      {step === 1 && (
        <Step title="Choose your service">
          <div className="space-y-4">
            {services.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Service</label>
                <div className="space-y-2">
                  {services.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setSelectedService(svc.id)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                        selectedService === svc.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/5'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{svc.name}</p>
                        {svc.description && <p className="text-xs text-slate-400">{svc.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-teal-700 dark:text-teal-300">RM {svc.price}</p>
                        <p className="text-xs text-slate-400">{svc.duration_minutes} min</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {staffList.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Staff preference (optional)</label>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                  <option value="">Any available staff</option>
                  {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            )}
            <Button disabled={!selectedService} onClick={() => setStep(2)}>Continue</Button>
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step title="Choose date and time">
          <div className="space-y-4">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            {slots.length > 0 ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Available times</label>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border p-2 text-center text-sm font-medium transition-colors ${
                        selectedSlot?.start_time === slot.start_time && selectedSlot?.end_time === slot.end_time
                          ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {slot.start_time}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No available slots for this date. Try another date.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!selectedSlot} onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        </Step>
      )}

      {step === 3 && (
        <Step title="Your details">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Your phone" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Your email" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Notes (optional)</label>
              <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Anything we should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>Review booking</Button>
            </div>
          </div>
        </Step>
      )}

      {step === 4 && (
        <Step title="Confirm your booking">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Service:</span> <span className="font-medium">{selectedServiceData?.name ?? '-'}</span></div>
                <div><span className="text-slate-500">Staff:</span> <span className="font-medium">{staffList.find((s) => s.id === selectedStaff)?.full_name ?? 'Any'}</span></div>
                <div><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <div><span className="text-slate-500">Time:</span> <span className="font-medium">{selectedSlot?.start_time} - {selectedSlot?.end_time}</span></div>
                <div className="col-span-2"><span className="text-slate-500">Duration:</span> <span className="font-medium">{selectedServiceData?.duration_minutes ?? 60} minutes</span></div>
              </div>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleConfirm} disabled={loading}>{loading ? 'Booking...' : 'Confirm booking'}</Button>
            </div>
          </div>
        </Step>
      )}
    </div>
  )
}
