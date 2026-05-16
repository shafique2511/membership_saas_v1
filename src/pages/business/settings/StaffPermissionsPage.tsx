import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStaffPermissions, setStaffPermission, type StaffPermission } from '@/services/settings'
import { SettingsTabs } from './SettingsTabs'
import { Shield, CheckCircle, XCircle } from 'lucide-react'

const ALL_PERMISSIONS = [
  { key: 'bookings.view', label: 'View bookings' },
  { key: 'bookings.create', label: 'Create bookings' },
  { key: 'bookings.edit', label: 'Edit bookings' },
  { key: 'bookings.cancel', label: 'Cancel bookings' },
  { key: 'bookings.check_in', label: 'Check-in customers' },
  { key: 'customers.view', label: 'View customers' },
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
  { key: 'staff.view', label: 'View staff' },
  { key: 'memberships.view', label: 'View memberships' },
  { key: 'memberships.assign', label: 'Assign memberships' },
]

const ROLES = ['manager', 'staff'] as const

export function StaffPermissionsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [permissions, setPermissions] = useState<StaffPermission[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    const p = await getStaffPermissions(businessId)
    setPermissions(p)
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Staff permissions</h2>
        <p className="text-sm text-slate-500">Granular access control for manager and staff roles.</p>
      </div>
      <SettingsTabs />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Permissions</CardTitle></CardHeader>
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
    </div>
  )
}
