import { useCallback, useEffect, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Search,
} from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import {
  getBookings,
  getServices,
  getStaff,
  getResources,
  getBranches,
  searchCustomers,
  createCustomer,
  createBooking,
  updateBooking,
  deleteBooking,
  getAvailableSlots,
  getStatusColor,
  nextStatuses,
  type BookingRow,
  type BookingType,
  type BookingStatus,
  type BookingFilters,
  type ServiceRow,
  type StaffRow,
  type ResourceRow,
  type BranchRow,
  type CustomerRow,
  type AvailableSlot,
} from '@/services/bookings'

type ViewMode = 'list' | 'daily' | 'weekly' | 'monthly'

const bookingTypes: BookingType[] = ['appointment', 'table', 'room', 'event', 'walk_in']
const statuses: BookingStatus[] = ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show']

function formatTime(t: string): string {
  return t?.slice(0, 5) ?? '-'
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getWeekDays(date: string): string[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(dd.getDate() + i)
    return dd.toISOString().slice(0, 10)
  })
}

function getMonthDays(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const days: (string | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    const dd = new Date(year, month, d)
    days.push(dd.toISOString().slice(0, 10))
  }
  return days
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

export function BookingsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentDate, setCurrentDate] = useState(todayISO())
  const [filters, setFilters] = useState<BookingFilters>({ date: todayISO() })
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerRow[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])

  const [openCreate, setOpenCreate] = useState(false)
  const [openDetail, setOpenDetail] = useState<BookingRow | null>(null)
  const [openEdit, setOpenEdit] = useState<BookingRow | null>(null)
  const [form, setForm] = useState({
    branch_id: '', booking_type: 'appointment' as BookingType, service_id: '',
    staff_id: '', resource_id: '', booking_date: todayISO(), start_time: '09:00',
    end_time: '10:00', notes: '', deposit_amount: '0', total_amount: '0',
    customer_id: '', customer_name: '', customer_phone: '', customer_email: '',
    create_new_customer: false,
  })

  const load = useCallback(async () => {
    if (!businessId) return
    const f: BookingFilters = { ...filters }
    if (viewMode === 'list') {
      f.date_from = filters.date_from ?? addDays(todayISO(), -30)
      f.date_to = filters.date_to ?? todayISO()
      delete f.date
    }
    setBookings(await getBookings(businessId, f))
  }, [businessId, filters, viewMode])

  const loadRelated = useCallback(async () => {
    if (!businessId) return
    const [svc, stf, res, brn] = await Promise.all([
      getServices(businessId), getStaff(businessId),
      getResources(businessId), getBranches(businessId),
    ])
    setServices(svc); setStaffList(stf); setResources(res); setBranches(brn)
  }, [businessId])

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(task)
  }, [load])

  useEffect(() => {
    const task = window.setTimeout(() => void loadRelated(), 0)
    return () => window.clearTimeout(task)
  }, [loadRelated])

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return }
    const task = window.setTimeout(async () => {
      setCustomerResults(await searchCustomers(businessId, customerSearch))
    }, 300)
    return () => window.clearTimeout(task)
  }, [customerSearch, businessId])

  useEffect(() => {
    if (!openCreate && !openEdit) return
    const date = openEdit ? openEdit.booking_date : form.booking_date
    const staffId = openEdit ? (openEdit.staff_id ?? undefined) : (form.staff_id || undefined)
    if (!date) return
    void getAvailableSlots(businessId, date, {
      service_id: form.service_id || undefined,
      staff_id: staffId,
      resource_id: form.resource_id || undefined,
      branch_id: form.branch_id || undefined,
    }).then(setAvailableSlots).catch(() => setAvailableSlots([]))
  }, [businessId, form.booking_date, form.service_id, form.staff_id, form.resource_id, openCreate, openEdit])

  async function handleCreateCustomer() {
    const c = await createCustomer({
      business_id: businessId,
      full_name: form.customer_name,
      phone: form.customer_phone || undefined,
      email: form.customer_email || undefined,
    })
    setForm({ ...form, customer_id: c.id, create_new_customer: false })
    return c
  }

  async function handleCreateBooking() {
    let customerId = form.customer_id
    if (form.create_new_customer && form.customer_name) {
      const c = await handleCreateCustomer()
      customerId = c.id
    }

    const b = await createBooking({
      business_id: businessId,
      branch_id: form.branch_id || null,
      customer_id: customerId || null,
      staff_id: form.staff_id || null,
      service_id: form.service_id || null,
      resource_id: form.resource_id || null,
      booking_type: form.booking_type,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes || null,
      deposit_amount: Number(form.deposit_amount),
      total_amount: Number(form.total_amount),
    })

    setOpenCreate(false)
    resetForm()
    await load()
    return b
  }

  async function handleEditBooking() {
    if (!openEdit) return
    await updateBooking(openEdit.id, {
      branch_id: form.branch_id || null,
      staff_id: form.staff_id || null,
      service_id: form.service_id || null,
      resource_id: form.resource_id || null,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes || null,
      deposit_amount: Number(form.deposit_amount),
      total_amount: Number(form.total_amount),
    })
    setOpenEdit(null)
    resetForm()
    await load()
  }

  async function handleStatusTransition(id: string, status: BookingStatus) {
    await updateBooking(id, { status: status as unknown as undefined } as Record<string, unknown> as never)
    await load()
    if (openDetail?.id === id) {
      setOpenDetail({ ...openDetail, status })
    }
  }

  async function handleDelete(id: string) {
    await deleteBooking(id)
    setOpenDetail(null)
    await load()
  }

  function resetForm() {
    setForm({
      branch_id: '', booking_type: 'appointment', service_id: '', staff_id: '',
      resource_id: '', booking_date: todayISO(), start_time: '09:00', end_time: '10:00',
      notes: '', deposit_amount: '0', total_amount: '0',
      customer_id: '', customer_name: '', customer_phone: '', customer_email: '',
      create_new_customer: false,
    })
  }

  function openEditFromDetail() {
    if (!openDetail) return
    setForm({
      branch_id: openDetail.branch_id ?? '',
      booking_type: openDetail.booking_type,
      service_id: openDetail.service_id ?? '',
      staff_id: openDetail.staff_id ?? '',
      resource_id: openDetail.resource_id ?? '',
      booking_date: openDetail.booking_date,
      start_time: openDetail.start_time?.slice(0, 5),
      end_time: openDetail.end_time?.slice(0, 5),
      notes: openDetail.notes ?? '',
      deposit_amount: String(openDetail.deposit_amount ?? 0),
      total_amount: String(openDetail.total_amount ?? 0),
      customer_id: openDetail.customer_id ?? '',
      customer_name: '', customer_phone: '', customer_email: '',
      create_new_customer: false,
    })
    setOpenEdit(openDetail)
    setOpenDetail(null)
  }

  const selectedService = services.find((s) => s.id === form.service_id)

  const bookingsByDate = bookings.reduce<Record<string, BookingRow[]>>((acc, b) => {
    const d = b.booking_date
    if (!acc[d]) acc[d] = []
    acc[d].push(b)
    return acc
  }, {})

  const monthDays = viewMode === 'monthly'
    ? getMonthDays(new Date(currentDate).getFullYear(), new Date(currentDate).getMonth())
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Manage appointments, tables, rooms, event spaces, and walk-ins."
        actions={<Button onClick={() => { resetForm(); setOpenCreate(true) }}><Plus className="h-4 w-4" />New booking</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700">
          {(['list', 'daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode)
                if (mode === 'list') {
                  setFilters({ date_from: addDays(todayISO(), -30), date_to: todayISO() })
                } else {
                  setFilters({ date: currentDate })
                }
              }}
              className={`px-3 py-1.5 text-xs font-medium first:rounded-l-lg last:rounded-r-lg ${
                viewMode === mode
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {mode === 'list' ? <List className="h-3.5 w-3.5" /> : mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : <Calendar className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>

        {viewMode !== 'list' && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'weekly' ? -7 : viewMode === 'monthly' ? -31 : -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[120px] text-center text-sm font-medium">
              {viewMode === 'monthly'
                ? new Date(currentDate).toLocaleString('en', { month: 'long', year: 'numeric' })
                : new Date(currentDate).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <Button size="sm" variant="outline" onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'weekly' ? 7 : viewMode === 'monthly' ? 31 : 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCurrentDate(todayISO())}>Today</Button>
          </div>
        )}

        <div className="flex flex-1 flex-wrap gap-2">
          <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={filters.status as string ?? ''} onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as BookingStatus | undefined })}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={filters.staff_id ?? ''} onChange={(e) => setFilters({ ...filters, staff_id: e.target.value || undefined })}>
            <option value="">All staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={filters.branch_id ?? ''} onChange={(e) => setFilters({ ...filters, branch_id: e.target.value || undefined })}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={filters.booking_type ?? ''} onChange={(e) => setFilters({ ...filters, booking_type: (e.target.value || undefined) as BookingType | undefined })}>
            <option value="">All types</option>
            {bookingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={[
                { key: 'booking_date', header: 'Date', render: (r) => new Date(String(r.booking_date)).toLocaleDateString('en', { day: 'numeric', month: 'short' }) },
                { key: 'customers', header: 'Customer', render: (r) => {
                  const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
                  return c?.full_name ?? 'Walk-in'
                }},
                { key: 'services', header: 'Service', render: (r) => {
                  const svc = Array.isArray(r.services) ? r.services[0] : r.services
                  return svc?.name ?? '-'
                }},
                { key: 'staff', header: 'Staff', render: (r) => {
                  const s = Array.isArray(r.staff) ? r.staff[0] : r.staff
                  return s?.full_name ?? '-'
                }},
                { key: 'start_time', header: 'Time', render: (r) => `${formatTime(String(r.start_time))} - ${formatTime(String(r.end_time))}` },
                { key: 'booking_type', header: 'Type', render: (r) => <Badge variant="muted">{String(r.booking_type)}</Badge> },
                { key: 'status', header: 'Status', render: (r) => {
                  const cls = getStatusColor(String(r.status))
                  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{String(r.status)}</span>
                }},
                { key: 'actions', header: '', render: (r) => <Button size="sm" variant="ghost" onClick={() => setOpenDetail(r as unknown as BookingRow)}>View</Button> },
              ]}
              data={bookings as unknown as Record<string, unknown>[]}
              emptyMessage="No bookings found."
            />
          </CardContent>
        </Card>
      )}

      {viewMode === 'daily' && (
        <div className="space-y-2">
          {HOURS.map((hour) => {
            const hourMinutes = timeToMinutes(hour)
            const hourBookings = bookings.filter((b) => {
              const bStart = timeToMinutes(b.start_time)
              const bEnd = timeToMinutes(b.end_time)
              return bStart < hourMinutes + 60 && bEnd > hourMinutes
            })

            return (
              <div key={hour} className="flex gap-3">
                <div className="w-14 shrink-0 pt-1 text-right text-xs text-slate-400">{hour}</div>
                <div className="flex min-h-[48px] flex-1 flex-wrap gap-1 rounded-md border border-slate-100 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                  {hourBookings.length === 0 && (
                    <span className="p-1 text-xs text-slate-300">—</span>
                  )}
                  {hourBookings.map((b) => {
                    const c = Array.isArray(b.customers) ? b.customers[0] : b.customers
                    return (
                      <button
                        key={b.id}
                        onClick={() => setOpenDetail(b)}
                        className={`cursor-pointer rounded px-2 py-1 text-left text-xs font-medium ${getStatusColor(b.status)}`}
                      >
                        <span>{formatTime(b.start_time)}</span>
                        <span className="ml-1">{c?.full_name ?? 'Walk-in'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'weekly' && (
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays(currentDate).map((day) => {
            const dayBookings = bookingsByDate[day] ?? []
            return (
              <div key={day} className="space-y-1">
                <div className={`rounded-md p-2 text-center text-xs font-medium ${day === todayISO() ? 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200' : 'bg-slate-50 dark:bg-slate-800'}`}>
                  <div>{new Date(day).toLocaleString('en', { weekday: 'short' })}</div>
                  <div className="text-lg">{new Date(day).getDate()}</div>
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 5).map((b) => {
                    const c = Array.isArray(b.customers) ? b.customers[0] : b.customers
                    return (
                      <button
                        key={b.id}
                        onClick={() => setOpenDetail(b)}
                        className={`block w-full cursor-pointer rounded px-1.5 py-1 text-left text-[10px] font-medium leading-tight ${getStatusColor(b.status)}`}
                      >
                        <div>{formatTime(b.start_time)} {c?.full_name ?? 'Walk-in'}</div>
                      </button>
                    )
                  })}
                  {dayBookings.length > 5 && (
                    <p className="text-center text-[10px] text-slate-400">+{dayBookings.length - 5} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'monthly' && (
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-slate-500">{d}</div>
          ))}
          {monthDays.map((day, i) => {
            const dayBookings = day ? (bookingsByDate[day] ?? []) : []
            const isToday = day === todayISO()
            return (
              <div
                key={i}
                className={`min-h-[72px] rounded-md border p-1 ${isToday ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/5' : 'border-slate-100 dark:border-slate-800'} ${!day ? 'invisible' : ''}`}
              >
                {day && (
                  <>
                    <div className="text-right text-xs text-slate-500">{new Date(day).getDate()}</div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 3).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setOpenDetail(b)}
                          className={`block w-full cursor-pointer rounded px-1 text-[9px] font-medium leading-tight ${getStatusColor(b.status)}`}
                        >
                          {formatTime(b.start_time)}
                        </button>
                      ))}
                      {dayBookings.length > 3 && (
                        <p className="text-center text-[9px] text-slate-400">+{dayBookings.length - 3}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
        <span className="font-medium">Legend:</span>
        {statuses.map((s) => (
          <span key={s} className={`inline-block rounded-full px-2 py-0.5 font-medium ${getStatusColor(s)}`}>{s}</span>
        ))}
      </div>

      <FormModal
        open={openCreate}
        title="New booking"
        submitLabel="Create booking"
        onSubmit={handleCreateBooking}
        onOpenChange={(v) => { setOpenCreate(v); if (!v) resetForm() }}
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Booking type</label>
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.booking_type} onChange={(e) => setForm({ ...form, booking_type: e.target.value as BookingType })}>
              {bookingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Select branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
            <option value="">Select service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min @ RM{s.price})</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
            <option value="">Assign staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: e.target.value })}>
            <option value="">Assign resource</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.resource_type})</option>)}
          </select>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
            <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Start time</label>
            <Input type="time" value={form.start_time} onChange={(e) => {
              const start = e.target.value
              const dur = selectedService?.duration_minutes ?? 60
              const [h, m] = start.split(':').map(Number)
              const endMin = h * 60 + m + dur
              const endH = Math.floor(endMin / 60)
              const endM = endMin % 60
              setForm({ ...form, start_time: start, end_time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}` })
            }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">End time</label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>

          {availableSlots.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500">Available slots</label>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {availableSlots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, start_time: slot.start_time, end_time: slot.end_time })}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      form.start_time === slot.start_time
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {slot.start_time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Customer</label>
            {form.create_new_customer ? (
              <div className="space-y-2">
                <Input placeholder="Full name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                <Input placeholder="Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                <Input placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
                <button type="button" className="text-xs text-teal-600" onClick={() => setForm({ ...form, create_new_customer: false, customer_name: '', customer_phone: '', customer_email: '' })}>
                  Search existing customer instead
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input className="pl-8" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                </div>
                {customerResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setForm({ ...form, customer_id: c.id }); setCustomerSearch(c.full_name); setCustomerResults([]) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" className="text-xs text-teal-600" onClick={() => setForm({ ...form, create_new_customer: true })}>
                  + Create new customer
                </button>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Notes & amounts</label>
            <textarea
              className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="Booking notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Deposit amount" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} />
              <Input type="number" placeholder="Total amount" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
            </div>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={!!openEdit}
        title="Edit booking"
        submitLabel="Save changes"
        onSubmit={handleEditBooking}
        onOpenChange={(v) => { if (!v) { setOpenEdit(null); resetForm() } }}
      >
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Select branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
            <option value="">Select service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
            <option value="">Assign staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: e.target.value })}>
            <option value="">Assign resource</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
            <Input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Start</label>
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">End</label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <textarea
              className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="Notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Deposit" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} />
              <Input type="number" placeholder="Total" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
            </div>
          </div>
        </div>
      </FormModal>

      {openDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpenDetail(null)} />
          <div className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Booking details</h3>
              <button onClick={() => setOpenDetail(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(openDetail.status)}`}>{openDetail.status}</span>
                <Badge variant="muted">{openDetail.booking_type}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium">{new Date(openDetail.booking_date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium">{formatTime(openDetail.start_time)} - {formatTime(openDetail.end_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Customer</p>
                  <p className="font-medium">
                    {(() => {
                      const c = Array.isArray(openDetail.customers) ? openDetail.customers[0] : openDetail.customers
                      return c?.full_name ?? 'Walk-in'
                    })()}
                  </p>
                  {(() => {
                    const c = Array.isArray(openDetail.customers) ? openDetail.customers[0] : openDetail.customers
                    return c?.phone ? <p className="text-xs text-slate-400">{c.phone}</p> : null
                  })()}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Service</p>
                  <p className="font-medium">
                    {(() => {
                      const svc = Array.isArray(openDetail.services) ? openDetail.services[0] : openDetail.services
                      return svc?.name ?? '-'
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Staff</p>
                  <p className="font-medium">
                    {(() => {
                      const s = Array.isArray(openDetail.staff) ? openDetail.staff[0] : openDetail.staff
                      return s?.full_name ?? '-'
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="font-medium">RM {Number(openDetail.total_amount).toLocaleString()} {openDetail.deposit_amount > 0 && <span className="text-xs text-slate-400">(RM {openDetail.deposit_amount} deposit)</span>}</p>
                </div>
              </div>

              {openDetail.notes && (
                <div>
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="text-sm">{openDetail.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                {nextStatuses(openDetail.status).map((ns) => (
                  <Button key={ns} size="sm" onClick={() => void handleStatusTransition(openDetail.id, ns)}>
                    {ns === 'confirmed' ? 'Confirm' : ns === 'checked_in' ? 'Check in' : ns === 'in_progress' ? 'Start' : ns === 'completed' ? 'Complete' : ns === 'cancelled' ? 'Cancel' : ns === 'no_show' ? 'No show' : ns}
                  </Button>
                ))}
                <Button size="sm" variant="outline" onClick={openEditFromDetail}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => void handleDelete(openDetail.id)}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
