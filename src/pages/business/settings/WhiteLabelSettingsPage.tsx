import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { getWhiteLabelSettings, upsertWhiteLabelSettings, type WhiteLabelSettings } from '@/services/whiteLabel'
import { Paintbrush, Globe, Image, Eye, Network } from 'lucide-react'
import { SettingsTabs } from './SettingsTabs'

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
    reseller_name: '',
    reseller_support_email: '',
    reseller_footer_text: '',
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
        reseller_name: s.reseller_name ?? '',
        reseller_support_email: s.reseller_support_email ?? '',
        reseller_footer_text: s.reseller_footer_text ?? '',
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
        reseller_name: '', reseller_support_email: '', reseller_footer_text: '',
      })
      setForm({
        brand_name: '', logo_url: '', primary_color: '#0f766e', secondary_color: '#0d9488',
        custom_domain: '', support_email: '', footer_text: '', hide_platform_branding: false,
        reseller_name: '', reseller_support_email: '', reseller_footer_text: '',
      })
      setMessage('Reset to defaults.')
    } finally { setSaving(false) }
  }

  if (!whiteLabelEnabled) {
    return (
      <div className="space-y-6">
        <SettingsTabs />
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
      <SettingsTabs />
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
            <Field label="Brand name" description="Name shown in the customer portal and branded pages.">
              <Input value={form.brand_name} onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))} placeholder="Your business name" />
            </Field>
            <Field label="Logo URL" description="Public image URL for your logo. Use Supabase Storage or your own CDN.">
              <div className="flex gap-2">
                <Input value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://example.com/logo.png" className="flex-1" />
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-slate-50">
                  {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <Image className="h-5 w-5 m-2.5 text-slate-300" />}
                </div>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary color" description="Main brand color for buttons, highlights, and headers.">
                <div className="flex gap-2">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded border" />
                  <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
                </div>
              </Field>
              <Field label="Secondary color" description="Accent color used with the primary color in branded areas.">
                <div className="flex gap-2">
                  <input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded border" />
                  <Input value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="flex-1" />
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Domain & contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Custom domain" description="Domain customers can use for your branded portal after DNS setup.">
                <Input value={form.custom_domain} onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value }))} placeholder="members.yourbusiness.com" />
              </Field>
              <div className="rounded-lg border bg-slate-50 p-3 text-xs dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-medium">Domain status</span>
                  <Badge variant={settings?.domain_status === 'verified' ? 'success' : settings?.domain_status === 'failed' ? 'danger' : 'warning'}>
                    {settings?.domain_status?.replaceAll('_', ' ') ?? 'not configured'}
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Prepared for app.luxantaramembers.com, admin.luxantaramembers.com, business slug subdomains, and verified custom booking domains.
                </p>
                {settings?.domain_dns_records && Object.keys(settings.domain_dns_records).length > 0 ? (
                  <div className="mt-3 rounded-md bg-white p-2 font-mono text-[11px] dark:bg-slate-950">
                    <p>Type: {String(settings.domain_dns_records.type ?? 'CNAME')}</p>
                    <p>Host: {String(settings.domain_dns_records.host ?? form.custom_domain)}</p>
                    <p>Value: {String(settings.domain_dns_records.value ?? 'customer.luxantaramembers.com')}</p>
                  </div>
                ) : null}
              </div>
              <Field label="Support email" description="Customer-facing support email shown on branded pages.">
                <Input value={form.support_email} onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))} placeholder="support@yourbusiness.com" />
              </Field>
              <Field label="Footer text" description="Optional small print shown at the bottom of branded customer pages.">
                <textarea className="h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.footer_text} onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))} placeholder="© 2026 Your Business. All rights reserved." />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Network className="h-4 w-4" /> Reseller-ready structure</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Reseller name" description="Optional reseller or operator name for future reseller portals.">
                <Input value={form.reseller_name} onChange={(e) => setForm((f) => ({ ...f, reseller_name: e.target.value }))} placeholder="Agency or operator name" />
              </Field>
              <Field label="Reseller support email" description="Optional support email for reseller-managed businesses.">
                <Input value={form.reseller_support_email} onChange={(e) => setForm((f) => ({ ...f, reseller_support_email: e.target.value }))} placeholder="support@reseller.com" />
              </Field>
              <Field label="Reseller footer text" description="Optional footer override for reseller-managed customer portals.">
                <textarea className="h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.reseller_footer_text} onChange={(e) => setForm((f) => ({ ...f, reseller_footer_text: e.target.value }))} placeholder="Managed by your agency" />
              </Field>
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
