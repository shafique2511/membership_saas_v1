import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStaffPermissions, getStaffUserPermissions, setStaffPermission, setStaffUserPermission, type StaffPermission, type StaffUserPermission } from '@/services/settings'
import { getStaff, type Staff } from '@/services/staff'
import { SettingsTabs } from './SettingsTabs'
import type { Permission } from '@/types'
import { Shield, CheckCircle, XCircle } from 'lucide-react'

const ALL_PERMISSIONS = [
  { key: 'bookings.view' as Permission, label: 'View bookings' },
  { key: 'bookings.create' as Permission, label: 'Create bookings' },
  { key: 'bookings.edit' as Permission, label: 'Edit bookings' },
  { key: 'bookings.cancel' as Permission, label: 'Cancel bookings' },
  { key: 'bookings.check_in' as Permission, label: 'Check-in customers' },
  { key: 'customers.view_basic' as Permission, label: 'View customers' },
  { key: 'customers.create', label: 'Create customers' },
  { key: 'customers.edit', label: 'Edit customers' },
  { key: 'payments.process', label: 'Process payments' },
  { key: 'payments.refund', label: 'Process refunds' },
  { key: 'payments.view', label: 'View payments' },
  { key: 'inventory.view', label: 'View inventory' },
  { key: 'inventory.adjust', label: 'Adjust stock' },
  { key: 'pos.access', label: 'Access POS' },
  { key: 'reports.view', label: 'View reports' },
  { key: 'settings.view', label: 'View settings' },
  { key: 'staff.manage', label: 'Manage staff' },
  { key: 'staff.permissions.manage', label: 'Manage staff permissions' },
  { key: 'memberships.view', label: 'View memberships' },
  { key: 'memberships.assign', label: 'Assign memberships' },
].map((p) => ({ ...p, key: p.key as Permission }))

const STAFF_ASSIGNABLE_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !['staff.permissions.manage', 'settings.view'].includes(p.key))

const ROLES = ['manager', 'staff'] as const

export function StaffPermissionsPage() {
  const { profile } = useAppContext()
  const { hasPermission } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [permissions, setPermissions] = useState<StaffPermission[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffPermissions, setStaffPermissions] = useState<StaffUserPermission[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const canManageRolePermissions = profile?.role === 'owner' || profile?.role === 'super_admin'
  const canManageIndividualStaff = canManageRolePermissions || hasPermission('staff.permissions.manage')

  const load = useCallback(async () => {
    if (!businessId) return
    const [p, s, sp] = await Promise.all([
      getStaffPermissions(businessId),
      getStaff(businessId, { status: 'active' }) as Promise<Staff[]>,
      getStaffUserPermissions(businessId),
    ])
    setPermissions(p)
    setStaff(s.filter((member) => member.role === 'staff'))
    setStaffPermissions(sp)
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  function isGranted(role: string, key: string): boolean {
    return permissions.some((p) => p.role === role && p.permission_key === key && p.is_granted)
  }

  async function togglePermission(role: string, key: string, current: boolean) {
    setSaving(`${role}:${key}`)
    await setStaffPermission(businessId, role, key, !current)
    await load()
    setSaving(null)
  }

  function isStaffGranted(staffId: string, key: string): boolean {
    return staffPermissions.some((p) => p.staff_id === staffId && p.permission_key === key && p.is_granted)
  }

  async function toggleStaffPermission(staffId: string, key: Permission, current: boolean) {
    setSaving(`${staffId}:${key}`)
    await setStaffUserPermission(businessId, staffId, key, !current)
    setStaffPermissions(await getStaffUserPermissions(businessId))
    setSaving(null)
  }

  const assignablePermissions = canManageRolePermissions
    ? STAFF_ASSIGNABLE_PERMISSIONS
    : STAFF_ASSIGNABLE_PERMISSIONS.filter((p) => hasPermission(p.key))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Staff permissions</h2>
        <p className="text-sm text-slate-500">Control manager delegation and individual staff module access.</p>
      </div>
      <SettingsTabs />

      {!canManageIndividualStaff && (
        <Card>
          <CardContent className="p-6 text-sm text-slate-500">
            You do not have permission to manage staff access.
          </CardContent>
        </Card>
      )}

      {canManageRolePermissions && (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Role permissions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r} className="p-3 font-medium capitalize text-center">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="border-b last:border-0">
                    <td className="p-3">{perm.label}</td>
                    {ROLES.map((role) => {
                      const granted = isGranted(role, perm.key)
                      const loading = saving === `${role}:${perm.key}`
                      return (
                        <td key={role} className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePermission(role, perm.key, granted)}
                            disabled={!!loading}
                          >
                            {loading ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                            ) : granted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {canManageIndividualStaff && (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Individual staff access</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="sticky left-0 bg-white p-3 font-medium dark:bg-slate-950">Staff</th>
                  {assignablePermissions.map((p) => (
                    <th key={p.key} className="min-w-32 p-3 text-center font-medium">{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="sticky left-0 bg-white p-3 dark:bg-slate-950">
                      <div className="font-medium">{member.full_name}</div>
                      <div className="text-xs text-slate-500">{member.email ?? member.phone ?? 'No contact'}</div>
                    </td>
                    {assignablePermissions.map((perm) => {
                      const granted = isStaffGranted(member.id, perm.key)
                      const loading = saving === `${member.id}:${perm.key}`
                      return (
                        <td key={perm.key} className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleStaffPermission(member.id, perm.key, granted)}
                            disabled={!!loading}
                          >
                            {loading ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                            ) : granted ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-300" />
                            )}
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={assignablePermissions.length + 1} className="p-6 text-center text-sm text-slate-500">
                      No active staff users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
