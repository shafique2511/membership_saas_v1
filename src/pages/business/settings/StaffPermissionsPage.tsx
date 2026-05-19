import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createStaffCustomRole, getStaffCustomRoles, getStaffPermissions, getStaffUserPermissions, setStaffPermission, setStaffPermissionRole, setStaffUserPermission, type StaffCustomRole, type StaffPermission, type StaffUserPermission } from '@/services/settings'
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
  { key: 'pos.discount', label: 'Give POS discount' },
  { key: 'reports.view', label: 'View reports' },
  { key: 'reports.export', label: 'Export reports' },
  { key: 'settings.view', label: 'View settings' },
  { key: 'settings.manage', label: 'Manage settings' },
  { key: 'staff.manage', label: 'Manage staff' },
  { key: 'staff.permissions.manage', label: 'Manage staff permissions' },
  { key: 'memberships.view', label: 'View memberships' },
  { key: 'memberships.assign', label: 'Assign memberships' },
  { key: 'memberships.manage', label: 'Manage memberships' },
  { key: 'loyalty.manage', label: 'Manage loyalty' },
  { key: 'records.delete', label: 'Delete records' },
].map((p) => ({ ...p, key: p.key as Permission }))

const MANAGER_RESTRICTED_PERMISSIONS: Permission[] = [
  'staff.permissions.manage',
  'settings.manage',
  'billing.manage',
  'business.manage',
  'business.delete',
  'platform.access',
  'data.export',
  'data.backup.manage',
  'records.delete',
]

const STAFF_ASSIGNABLE_PERMISSIONS = ALL_PERMISSIONS.filter((p) => !MANAGER_RESTRICTED_PERMISSIONS.includes(p.key))

const BASE_ROLES = [
  { key: 'manager', label: 'Manager' },
  { key: 'staff', label: 'Staff' },
]

export function StaffPermissionsPage() {
  const { profile } = useAppContext()
  const { hasPermission } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [permissions, setPermissions] = useState<StaffPermission[]>([])
  const [customRoles, setCustomRoles] = useState<StaffCustomRole[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffPermissions, setStaffPermissions] = useState<StaffUserPermission[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const canManageRolePermissions = profile?.role === 'owner' || profile?.role === 'super_admin'
  const canManageIndividualStaff = canManageRolePermissions || hasPermission('staff.permissions.manage')

  const load = useCallback(async () => {
    if (!businessId) return
    const [p, roles, s, sp] = await Promise.all([
      getStaffPermissions(businessId),
      getStaffCustomRoles(businessId),
      getStaff(businessId, { status: 'active' }) as Promise<Staff[]>,
      getStaffUserPermissions(businessId),
    ])
    setPermissions(p)
    setCustomRoles(roles)
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

  async function createRole() {
    if (!roleName.trim()) return
    setSaving('custom-role:create')
    await createStaffCustomRole(businessId, roleName.trim(), roleDescription.trim() || undefined)
    setRoleName('')
    setRoleDescription('')
    await load()
    setSaving(null)
  }

  async function assignPermissionRole(staffId: string, roleKey: string) {
    setSaving(`${staffId}:permission-role`)
    await setStaffPermissionRole(businessId, staffId, roleKey === 'staff' ? null : roleKey)
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
  const roleColumns = [...BASE_ROLES, ...customRoles.map((role) => ({ key: role.role_key, label: role.role_name }))]
  const assignableRoles = [{ key: 'staff', label: 'Default staff' }, ...customRoles.map((role) => ({ key: role.role_key, label: role.role_name }))]

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
        <CardContent className="space-y-4 p-0">
          <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_1fr_auto]">
            <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Custom role name, e.g. Cashier" />
            <Input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="Optional description" />
            <Button onClick={createRole} disabled={saving === 'custom-role:create' || !roleName.trim()}>
              {saving === 'custom-role:create' ? 'Creating...' : 'Create role'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Permission</th>
                  {roleColumns.map((r) => (
                    <th key={r.key} className="p-3 font-medium text-center">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_PERMISSIONS.map((perm) => (
                  <tr key={perm.key} className="border-b last:border-0">
                    <td className="p-3">{perm.label}</td>
                    {roleColumns.map((role) => {
                      const granted = isGranted(role.key, perm.key)
                      const loading = saving === `${role.key}:${perm.key}`
                      return (
                        <td key={role.key} className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePermission(role.key, perm.key, granted)}
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
                  <th className="min-w-44 p-3 font-medium">Permission role</th>
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
                    <td className="p-3">
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={member.permission_role_key ?? 'staff'}
                        onChange={(event) => assignPermissionRole(member.id, event.target.value)}
                        disabled={!canManageRolePermissions || saving === `${member.id}:permission-role`}
                      >
                        {assignableRoles.map((role) => (
                          <option key={role.key} value={role.key}>{role.label}</option>
                        ))}
                      </select>
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
                    <td colSpan={assignablePermissions.length + 2} className="p-6 text-center text-sm text-slate-500">
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
