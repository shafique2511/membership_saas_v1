import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getCustomerByUserId, updateCustomerProfile } from '@/services/customerPortal'
import { updatePassword } from '@/services/auth'
import { UserRound, LogOut, KeyRound, Save } from 'lucide-react'

export function CustomerProfilePage() {
  const { businessId } = useParams()
  const { profile, logout } = useAppContext()
  const navigate = useNavigate()
  const customerId = profile?.id ?? ''
  const bizId = businessId ?? profile?.business_id ?? ''

  const [customer, setCustomer] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', birthday: '', gender: '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!customerId || !bizId) return
    const c = await getCustomerByUserId(customerId, bizId)
    if (c) {
      setCustomer(c)
      setForm({
        full_name: (c.full_name as string) ?? '',
        phone: (c.phone as string) ?? '',
        email: (c.email as string) ?? '',
        birthday: (c.birthday as string) ?? '',
        gender: (c.gender as string) ?? '',
      })
    }
  }, [customerId, bizId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSaveProfile() {
    if (!customer?.id) return
    setSaving(true)
    try {
      await updateCustomerProfile(customer.id as string, form)
      setMessage('Profile updated.')
    } catch (err) {
      setMessage(String(err))
    } finally { setSaving(false) }
  }

  async function handleChangePassword() {
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage('Passwords do not match.')
      return
    }
    if (passwordForm.new.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    setPasswordSaving(true)
    try {
      await updatePassword(passwordForm.new)
      setMessage('Password changed.')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err) {
      setMessage(String(err))
    } finally { setPasswordSaving(false) }
  }

  async function handleLogout() {
    await logout()
    navigate('/auth/login')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          <UserRound className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{form.full_name || 'Profile'}</h2>
          <p className="text-sm text-slate-500">{form.email}</p>
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-700">{message}</div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Edit profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Full name</label>
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Birthday</label>
            <Input type="date" value={form.birthday} onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Gender</label>
            <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <Button className="w-full" onClick={handleSaveProfile} disabled={saving}>
            <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Current password</label>
            <Input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">New password</label>
            <Input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Confirm new password</label>
            <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} />
          </div>
          <Button className="w-full" variant="outline" onClick={handleChangePassword} disabled={passwordSaving}>
            <KeyRound className="mr-1 h-4 w-4" /> {passwordSaving ? 'Changing...' : 'Change password'}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-red-500" onClick={handleLogout}>
        <LogOut className="mr-1 h-4 w-4" /> Sign out
      </Button>
    </div>
  )
}
