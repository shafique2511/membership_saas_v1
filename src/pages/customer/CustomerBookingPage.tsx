import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getServices, getStaff, getResources, getAvailableSlots, createBooking, createGuestBooking, type BookingType, type ServiceRow, type StaffRow, type ResourceRow, type AvailableSlot } from '@/services/bookings'
import { Scissors, UserRound, Calendar, Clock, DollarSign, CheckCircle } from 'lucide-react'
import { useCustomerBusinessRoute } from '@/hooks/useCustomerBusinessRoute'

export function CustomerBookingPage() {
  const { businessId, portalHome, routeBase } = useCustomerBusinessRoute()
  const { profile } = useAppContext()
  const navigate = useNavigate()
  const customerId = profile?.id ?? ''

  const bizId = businessId || profile?.business_id || ''

  const [step, setStep] = useState(1)
  const [services, setServices] = useState<ServiceRow[]>([])
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [slots, setSlots] = useState<AvailableSlot[]>([])

  const [bookingType, setBookingType] = useState<BookingType>('appointment')
  const [selectedService, setSelectedService] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedResource, setSelectedResource] = useState('')
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
    if (!bizId) return
    const [svc, stf, res] = await Promise.all([
      getServices(bizId),
      getStaff(bizId),
      getResources(bizId),
    ])
    setServices(svc); setStaffList(stf)
    setResources(res)
  }, [bizId])

  useEffect(() => { void loadData() }, [loadData])

  useEffect(() => {
    if (!selectedDate || !bizId) return
    void getAvailableSlots(bizId, selectedDate, {
      service_id: selectedService || undefined,
      staff_id: selectedStaff || undefined,
      resource_id: selectedResource || undefined,
    }).then(setSlots).catch(() => setSlots([]))
  }, [bizId, selectedDate, selectedService, selectedStaff, selectedResource])

  async function handleConfirm() {
    if (!selectedSlot) return
    const assignedStaffId = selectedStaff || selectedSlot.staff_id || null
    setLoading(true)
    setError('')
    try {
      if (!customerId) {
        if (!customerName.trim() || !customerPhone.trim()) {
          setError('Name and phone are required for guest booking.')
          return
        }

        await createGuestBooking({
          business_id: bizId,
          full_name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || null,
          resource_id: selectedResource || null,
          staff_id: assignedStaffId,
          service_id: selectedService || null,
          booking_type: bookingType,
          booking_date: selectedDate,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          notes: notes || null,
        })
        setDone(true)
        return
      }

      await createBooking({
        business_id: bizId,
        customer_id: customerId,
        resource_id: selectedResource || null,
        staff_id: assignedStaffId,
        service_id: selectedService || null,
        booking_type: bookingType,
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
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Booking confirmed!</h2>
            <p className="mt-2 text-sm text-slate-500">Your appointment has been booked.</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate(portalHome)}>Home</Button>
              <Button onClick={() => navigate(`${routeBase}/history`)}>View bookings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const StepIndicator = ({ num, label }: { num: number; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        step === num ? 'bg-teal-700 text-white' : step > num ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'
      }`}>
        {step > num ? <CheckCircle className="h-4 w-4" /> : num}
      </div>
      <span className={`text-xs font-medium ${step === num ? 'text-teal-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <StepIndicator num={1} label="Service" />
        <div className="h-px flex-1 mx-2 bg-slate-200" />
        <StepIndicator num={2} label="Time" />
        <div className="h-px flex-1 mx-2 bg-slate-200" />
        <StepIndicator num={3} label="Details" />
        <div className="h-px flex-1 mx-2 bg-slate-200" />
        <StepIndicator num={4} label="Confirm" />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Choose service</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {services.length > 0 && (
              <div className="space-y-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setSelectedService(svc.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                      selectedService === svc.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/5'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{svc.name}</p>
                        {svc.description && <p className="text-xs text-slate-400">{svc.description}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-teal-700 dark:text-teal-300">RM {svc.price}</p>
                      <p className="text-xs text-slate-400">{svc.duration_minutes} min</p>
                    </div>
                  </button>
                ))}
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
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Booking type</label>
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={bookingType} onChange={(e) => setBookingType(e.target.value as BookingType)}>
                <option value="appointment">Appointment</option>
                <option value="table">Table booking</option>
                <option value="room">Room booking</option>
                <option value="event">Event space</option>
              </select>
            </div>
            {resources.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Resource preference (optional)</label>
                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}>
                  <option value="">Any available resource</option>
                  {resources.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.resource_type.replace('_', ' ')})</option>)}
                </select>
              </div>
            )}
            <Button disabled={!selectedService} onClick={() => setStep(2)} className="w-full">Continue</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Choose date & time</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            {slots.length > 0 ? (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">Available times</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border p-2 text-center text-sm font-medium transition-colors ${
                        selectedSlot?.start_time === slot.start_time
                          ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {slot.start_time?.substring(0, 5)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No available slots. Try another date.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button disabled={!selectedSlot} onClick={() => setStep(3)} className="flex-1">Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Name" description="Name the business will see on this booking.">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Phone" description="Contact number for booking updates or staff follow-up.">
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Your phone" />
            </Field>
            <Field label="Email" description="Optional email for booking confirmation and receipts.">
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Your email" />
            </Field>
            <Field label="Notes" description="Optional request, allergy, seating preference, or anything staff should know.">
              <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Anything we should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Confirm booking</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Service:</span>
                <span className="font-medium">{selectedServiceData?.name ?? '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Staff:</span>
                <span className="font-medium">{staffList.find((s) => s.id === selectedStaff)?.full_name ?? 'Any'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Type:</span>
                <span className="font-medium">{bookingType.replace('_', ' ')}</span>
              </div>
              {selectedResource && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Resource:</span>
                  <span className="font-medium">{resources.find((r) => r.id === selectedResource)?.name ?? '-'}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Date:</span>
                <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Time:</span>
                <span className="font-medium">{selectedSlot?.start_time?.substring(0, 5)} - {selectedSlot?.end_time?.substring(0, 5)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Price:</span>
                <span className="font-semibold text-teal-700">RM {selectedServiceData?.price ?? 0}</span>
              </div>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
              <Button onClick={handleConfirm} disabled={loading} className="flex-1">{loading ? 'Booking...' : 'Confirm'}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
