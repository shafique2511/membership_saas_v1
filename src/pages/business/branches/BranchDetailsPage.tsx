import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBranchById, getBranchStats, type Branch, type BranchStats } from '@/services/branches'
import { BranchTabs } from './BranchTabs'
import { Building2, MapPin, Phone, Mail, Clock, Users, Calendar, Package, DollarSign, AlertTriangle } from 'lucide-react'

export function BranchDetailsPage() {
  const { branchId } = useParams()
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [branch, setBranch] = useState<Branch | null>(null)
  const [stats, setStats] = useState<BranchStats | null>(null)

  const load = useCallback(async () => {
    if (!branchId || !businessId) return
    const [b, s] = await Promise.all([getBranchById(branchId), getBranchStats(branchId)])
    setBranch(b)
    setStats(s)
  }, [branchId, businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!branch) return <div className="p-6 text-sm text-slate-400">Loading...</div>

  const statCards = [
    { label: 'Staff', value: stats?.staff_count ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Customers', value: stats?.customer_count ?? 0, icon: Users, color: 'text-green-500' },
    { label: 'Bookings', value: stats?.booking_count ?? 0, icon: Calendar, color: 'text-purple-500' },
    { label: 'Revenue', value: `RM ${(stats?.revenue ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Products', value: stats?.inventory_count ?? 0, icon: Package, color: 'text-orange-500' },
    { label: 'Low stock', value: stats?.low_stock_count ?? 0, icon: AlertTriangle, color: 'text-red-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-slate-400" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{branch.name}</h2>
            <Badge variant={branch.status === 'active' ? 'default' : 'muted'}>{branch.status}</Badge>
            {branch.is_main && <Badge variant="default">Main</Badge>}
          </div>
          <p className="text-sm text-slate-500">Branch overview</p>
        </div>
      </div>

      <BranchTabs />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Branch information</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {branch.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{branch.address}</div>}
          {branch.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{branch.phone}</div>}
          {branch.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{branch.email}</div>}
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" />Created {new Date(branch.created_at).toLocaleDateString()}</div>
        </CardContent>
      </Card>
    </div>
  )
}
