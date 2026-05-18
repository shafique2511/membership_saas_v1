import { useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { SettingsTabs } from './SettingsTabs'
import { UserRound, Mail, Calendar } from 'lucide-react'

export function AccountSettingsPage() {
  const { profile } = useAppContext()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? '', email: profile.email ?? '', phone: profile.phone ?? '' })
    }
  }, [profile])

  async function handleSave() {
    setSaving(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('user_profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', profile?.id)
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Account settings</h2>
        <p className="text-sm text-slate-500">Manage your personal account details.</p>
      </div>
      <SettingsTabs />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Full name" description="Your display name shown in staff records, audit logs, and owner or manager screens.">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Email" description="Login email from Supabase Auth. Change it from authentication settings if needed.">
            <Input value={form.email} disabled className="bg-slate-50" />
          </Field>
          <Field label="Phone" description="Optional phone number for internal contact and staff profile records.">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Account info</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-500">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {profile?.email}</div>
          <div className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Role: <span className="capitalize font-medium">{profile?.role}</span></div>
          <div>Account created: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  )
}
