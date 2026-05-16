import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getBranchStaff, getAvailableStaffForBranch, assignStaffToBranch, removeStaffFromBranch, type BranchStaffWithName } from '@/services/branches'
import { getBranchById, type Branch } from '@/services/branches'
import { BranchTabs } from './BranchTabs'
import { UserPlus, X, Star, Users } from 'lucide-react'

export function BranchStaffPage() {
  const { branchId } = useParams()
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [branch, setBranch] = useState<Branch | null>(null)
  const [staff, setStaff] = useState<BranchStaffWithName[]>([])
  const [availableStaff, setAvailableStaff] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!branchId || !businessId) return
    const [b, s, avail] = await Promise.all([
      getBranchById(branchId),
      getBranchStaff(branchId),
      getAvailableStaffForBranch(businessId, branchId),
    ])
    setBranch(b)
    setStaff(s)
    setAvailableStaff(avail)
  }, [branchId, businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleAssign() {
    if (!branchId || !selectedStaffId) return
    setSaving(true)
    try {
      await assignStaffToBranch(branchId, selectedStaffId)
      setSelectedStaffId('')
      setShowAdd(false)
      await load()
    } finally { setSaving(false) }
  }

  async function handleRemove(id: string) {
    await removeStaffFromBranch(id)
    await load()
  }

  if (!branch) return <div className="p-6 text-sm text-slate-400">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{branch.name} — Staff</h2>
          <p className="text-sm text-slate-500">Manage staff assigned to this branch.</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} disabled={availableStaff.length === 0}>
          <UserPlus className="mr-1 h-4 w-4" /> Assign staff
        </Button>
      </div>

      <BranchTabs />

      {showAdd && (
        <Card>
          <CardHeader><CardTitle>Assign staff to branch</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">Select staff member</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
              ))}
            </select>
            {availableStaff.length === 0 && (
              <p className="text-sm text-slate-400">All active staff are already assigned to this branch.</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!selectedStaffId || saving}>Assign</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Assigned staff ({staff.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Role</th>
                  <th className="p-3 font-medium">Contact</th>
                  <th className="p-3 font-medium">Primary</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{s.staff_name}</td>
                    <td className="p-3"><Badge variant="muted">{s.staff_role}</Badge></td>
                    <td className="p-3 text-slate-500">
                      {s.staff_phone ?? s.staff_email ?? '-'}
                    </td>
                    <td className="p-3">
                      {s.is_primary ? <Star className="h-4 w-4 text-amber-400" /> : '-'}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(s.id)}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">
                    <Users className="mx-auto mb-2 h-8 w-8" />
                    No staff assigned to this branch.
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
