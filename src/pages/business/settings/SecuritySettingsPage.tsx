import { useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/services/auth'
import { SettingsTabs } from './SettingsTabs'
import { KeyRound, LogOut, History } from 'lucide-react'

export function SecuritySettingsPage() {
  const { logout } = useAppContext()
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [message, setMessage] = useState('')

  async function handleChangePassword() {
    if (pwForm.newPass !== pwForm.confirm) { setMessage('Passwords do not match.'); return }
    if (pwForm.newPass.length < 6) { setMessage('Password must be at least 6 characters.'); return }
    setSavingPw(true)
    setMessage('')
    try {
      await updatePassword(pwForm.newPass)
      setMessage('Password changed.')
      setPwForm({ current: '', newPass: '', confirm: '' })
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err))
    } finally { setSavingPw(false) }
  }

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Security settings</h2>
        <p className="text-sm text-slate-500">Password, sessions, and security preferences.</p>
      </div>
      <SettingsTabs />

      {message && (
        <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-700">{message}</div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Current password" description="Enter your existing password before setting a new one.">
            <Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
          </Field>
          <Field label="New password" description="Use at least 6 characters. A longer unique password is recommended.">
            <Input type="password" value={pwForm.newPass} onChange={(e) => setPwForm({ ...pwForm, newPass: e.target.value })} />
          </Field>
          <Field label="Confirm new password" description="Re-enter the new password to prevent typing mistakes.">
            <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
          </Field>
          <Button onClick={handleChangePassword} disabled={savingPw}>
            {savingPw ? 'Changing...' : 'Change password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Audit logs</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Review recent security events and changes made in your account.</p>
          <Button variant="outline" className="mt-3" onClick={() => window.location.href = '/admin/audit-logs'}>
            View audit logs
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><LogOut className="h-4 w-4" /> Sign out</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Sign out from all devices.</p>
          <Button variant="outline" className="mt-3 text-red-500" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
