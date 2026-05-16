import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBranchBookings, getBranchById, type Branch } from '@/services/branches'
import { BranchTabs } from './BranchTabs'
import { Calendar } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  checked_in: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  no_show: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
}

export function BranchBookingsPage() {
  const { branchId } = useParams()
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [branch, setBranch] = useState<Branch | null>(null)
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getBranchBookings>>>([])
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    if (!branchId || !businessId) return
    const [b, data] = await Promise.all([
      getBranchById(branchId),
      getBranchBookings(branchId, businessId, { status: filter || undefined }),
    ])
    setBranch(b)
    setBookings(data)
  }, [branchId, businessId, filter])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!branch) return <div className="p-6 text-sm text-slate-400">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{branch.name} — Bookings</h2>
        <p className="text-sm text-slate-500">View bookings for this branch.</p>
      </div>

      <BranchTabs />

      <div className="flex gap-2 overflow-x-auto">
        {['', 'pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Bookings {filter ? `(${filter})` : ''}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Service</th>
                  <th className="p-3 font-medium">Staff</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{b.customer_name}</td>
                    <td className="p-3 text-slate-500">{b.service_name}</td>
                    <td className="p-3 text-slate-500">{b.staff_name}</td>
                    <td className="p-3">{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td className="p-3">{b.start_time?.substring(0, 5)}-{b.end_time?.substring(0, 5)}</td>
                    <td className="p-3">RM {(b.total_amount ?? 0).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? ''}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-400">
                    <Calendar className="mx-auto mb-2 h-8 w-8" />
                    No bookings found.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
