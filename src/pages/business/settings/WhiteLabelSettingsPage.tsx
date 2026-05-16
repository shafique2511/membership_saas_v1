import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getWhiteLabelSettings, upsertWhiteLabelSettings, type WhiteLabelSettings } from '@/services/whiteLabel'
import { Paintbrush, Globe, Image, Eye } from 'lucide-react'

export function WhiteLabelSettingsPage() {
  const { profile, hasModule } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const whiteLabelEnabled = hasModule('white_label')

  const [settings, setSettings] = useState<WhiteLabelSettings | null>(null)
  const [form, setForm] = useState({
    brand_name: '',
    logo_url: '',
    primary_color: '#0f766e',
    secondary_color: '#0d9488',
    custom_domain: '',
    support_email: '',
    footer_text: '',
    hide_platform_branding: false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    const s = await getWhiteLabelSettings(businessId)
    if (s) {
      setSettings(s)
      setForm({
        brand_name: s.brand_name ?? '',
        logo_url: s.logo_url ?? '',
        primary_color: s.primary_color,
        secondary_color: s.secondary_color,
        custom_domain: s.custom_domain ?? '',
        support_email: s.support_email ?? '',
        footer_text: s.footer_text ?? '',
        hide_platform_branding: s.hide_platform_branding,
      })
    }
  }, [businessId])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  async function handleSave() {
    if (!businessId) return
    setSaving(true)
    setMessage('')
    try {
      const result = await upsertWhiteLabelSettings(businessId, form)
      setSettings(result as unknown as WhiteLabelSettings)
      setMessage('White label settings saved.')
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err))
    } finally { setSaving(false) }
  }

  async function handleReset() {
    if (!confirm('Reset to default branding?')) return
    if (!businessId) return
    setSaving(true)
    try {
      await upsertWhiteLabelSettings(businessId, {
        brand_name: '', logo_url: '', primary_color: '#0f766e', secondary_color: '#0d9488',
        custom_domain: '', support_email: '', footer_text: '', hide_platform_branding: false,
      })
      setForm({
        brand_name: '', logo_url: '', primary_color: '#0f766e', secondary_color: '#0d9488',
        custom_domain: '', support_email: '', footer_text: '', hide_platform_branding: false,
      })
      setMessage('Reset to defaults.')
    } finally { setSaving(false) }
  }

  if (!whiteLabelEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">White label</h2>
          <p className="text-sm text-slate-500">Custom branding for your business.</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <Paintbrush className="mx-auto mb-2 h-10 w-10" />
            <p>White label module is not enabled.</p>
            <p className="mt-1 text-xs">Available on the Enterprise plan or as an add-on.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">White label</h2>
          <p className="text-sm text-slate-500">Customize your brand appearance.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-700">{message}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Paintbrush className="h-4 w-4" /> Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Brand name</label>
              <Input value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} placeholder="Your business name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Logo URL</label>
              <div className="flex gap-2">
                <Input value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://example.com/logo.png" className="flex-1" />
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-slate-50">
                  {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <Image className="h-5 w-5 m-2.5 text-slate-300" />}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Primary color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded border" />
                  <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Secondary color</label>
                <div className="flex gap-2">
                  <input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded border" />
                  <Input value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Domain & contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Custom domain</label>
                <Input value={form.custom_domain} onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))} placeholder="members.yourbusiness.com" />
                <p className="mt-1 text-[10px] text-slate-400">DNS configuration required separately.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Support email</label>
                <Input value={form.support_email} onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))} placeholder="support@yourbusiness.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Footer text</label>
                <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.footer_text} onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))} placeholder="© 2026 Your Business. All rights reserved." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Platform branding</CardTitle></CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hide_platform_branding}
                  onChange={(e) => setForm((f) => ({ ...f, hide_platform_branding: e.target.checked }))}
                  className="h-5 w-5 rounded border-gray-300 text-teal-700"
                />
                <div>
                  <p className="text-sm font-medium">Hide Luxantara Members branding</p>
                  <p className="text-xs text-slate-400">Replaces platform branding with your business name.</p>
                </div>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleReset}>Reset to defaults</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save branding'}
        </Button>
      </div>

      {settings && (
        <Card>
          <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
          <CardContent>
            <div
              className="overflow-hidden rounded-xl"
              style={{ borderColor: form.primary_color, borderWidth: 2 }}
            >
              <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})` }}>
                <div className="flex items-center gap-3">
                  {form.logo_url && (
                    <img src={form.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <div>
                    <p className="text-xs opacity-80">Welcome to</p>
                    <p className="text-lg font-bold">{form.brand_name || 'Your Business'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 p-4 text-sm">
                <p>Customer portal preview with your brand colors and logo.</p>
                {!form.hide_platform_branding && (
                  <p className="text-[10px] text-slate-400">Powered by Luxantara Members</p>
                )}
                {form.footer_text && (
                  <p className="text-[10px] text-slate-400">{form.footer_text}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
