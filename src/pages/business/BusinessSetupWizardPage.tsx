import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Eye, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAppContext } from '@/context/useAppContext'
import {
  businessTypeOptions,
  completeBusinessSetup,
  defaultOpeningHours,
  presetForBusinessType,
  setupModuleOptions,
  type SetupProductInput,
  type SetupServiceInput,
  type SetupStaffInput,
} from '@/services/onboarding'
import type { BusinessType, ModuleKey } from '@/types'

const steps = [
  'Business type',
  'Profile',
  'Branch',
  'Services',
  'Staff',
  'Modules',
  'Preview',
  'Finish',
]

const timezones = ['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Manila', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Australia/Sydney', 'UTC']

export function BusinessSetupWizardPage() {
  const navigate = useNavigate()
  const { profile, refreshAuth } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [step, setStep] = useState(0)
  const [businessType, setBusinessType] = useState<BusinessType>('barber_shop')
  const preset = useMemo(() => presetForBusinessType(businessType), [businessType])
  const [profileForm, setProfileForm] = useState({
    name: '',
    logo_url: '',
    phone: '',
    whatsapp: '',
    email: profile?.email ?? '',
    address: '',
    timezone: 'Asia/Kuala_Lumpur',
  })
  const [branchForm, setBranchForm] = useState({
    name: 'Main Branch',
    address: '',
    opening_hours: defaultOpeningHours(),
    closing_days: ['sunday'],
  })
  const [services, setServices] = useState<SetupServiceInput[]>(preset.services)
  const [products, setProducts] = useState<SetupProductInput[]>(preset.products)
  const [staff, setStaff] = useState<SetupStaffInput[]>([{ full_name: '', role: 'staff', email: '', phone: '' }])
  const [modules, setModules] = useState<ModuleKey[]>(preset.modules)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function chooseBusinessType(nextType: BusinessType) {
    const nextPreset = presetForBusinessType(nextType)
    setBusinessType(nextType)
    setServices(nextPreset.services)
    setProducts(nextPreset.products)
    setModules(nextPreset.modules)
  }

  function toggleModule(module: ModuleKey) {
    setModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module])
  }

  async function finishSetup() {
    if (!businessId) {
      setError('Missing business account. Please sign in again.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await completeBusinessSetup({
        businessId,
        businessType,
        profile: profileForm,
        branch: branchForm,
        services,
        products,
        staff,
        modules,
      })
      await refreshAuth()
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to finish setup.')
    } finally {
      setSaving(false)
    }
  }

  function addService() {
    setServices((current) => [...current, { name: '', category: '', duration_minutes: 30, price: 0 }])
  }

  function addProduct() {
    setProducts((current) => [...current, { name: '', category: '', selling_price: 0, stock_quantity: 0 }])
  }

  function addStaff() {
    setStaff((current) => [...current, { full_name: '', role: 'staff', email: '', phone: '' }])
  }

  const canContinue = step !== 1 || profileForm.name.trim().length > 1

  if (profile?.role !== 'owner' && profile?.role !== 'super_admin') {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h2 className="text-lg font-semibold">Owner access required</h2>
          <p className="mt-2 text-sm text-slate-500">Only the business owner can run the setup wizard.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Business setup wizard" description="Set up the business profile, branch, catalog, staff, modules, and booking page preview." />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium ${index === step ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Choose business type</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {businessTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => chooseBusinessType(option.value)}
                className={`rounded-lg border p-4 text-left transition ${businessType === option.value ? 'border-teal-600 bg-teal-50 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="mt-1 text-xs text-slate-500">Use as setup starting point.</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Business profile</CardTitle></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            <Field label="Business name" description="Public name shown on booking pages, receipts, and customer portal.">
              <Input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
            </Field>
            <Field label="Logo URL" description="Optional logo image URL. Storage upload can be added later without blocking setup.">
              <Input value={profileForm.logo_url} onChange={(event) => setProfileForm({ ...profileForm, logo_url: event.target.value })} />
            </Field>
            <Field label="Phone" description="Main contact number for customers.">
              <Input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
            </Field>
            <Field label="WhatsApp" description="WhatsApp number used for customer contact links.">
              <Input value={profileForm.whatsapp} onChange={(event) => setProfileForm({ ...profileForm, whatsapp: event.target.value })} />
            </Field>
            <Field label="Email" description="Public business email for customer support.">
              <Input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
            </Field>
            <Field label="Timezone" description="Controls booking times, reports, and notification scheduling.">
              <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={profileForm.timezone} onChange={(event) => setProfileForm({ ...profileForm, timezone: event.target.value })}>
                {timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
              </select>
            </Field>
            <Field className="lg:col-span-2" label="Address" description="Main address shown to customers and copied to the first branch if branch address is empty.">
              <Input value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} />
            </Field>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Main branch</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Branch name" description="Name of the first location.">
              <Input value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} />
            </Field>
            <Field label="Branch address" description="Leave empty to reuse the business address.">
              <Input value={branchForm.address} onChange={(event) => setBranchForm({ ...branchForm, address: event.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Opening time" description="Default opening time copied across operating days.">
                <Input type="time" value="09:00" readOnly />
              </Field>
              <Field label="Closing days" description="Comma-separated closing days.">
                <Input value={branchForm.closing_days.join(', ')} onChange={(event) => setBranchForm({ ...branchForm, closing_days: event.target.value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean) })} />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Services</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1fr_160px_120px_40px] dark:border-slate-800">
                  <Input placeholder="Service name" value={service.name} onChange={(event) => setServices((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                  <Input type="number" placeholder="Minutes" value={service.duration_minutes} onChange={(event) => setServices((current) => current.map((item, i) => i === index ? { ...item, duration_minutes: Number(event.target.value) } : item))} />
                  <Input type="number" placeholder="Price" value={service.price} onChange={(event) => setServices((current) => current.map((item, i) => i === index ? { ...item, price: Number(event.target.value) } : item))} />
                  <Button size="icon" variant="outline" onClick={() => setServices((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addService}><Plus className="mr-1 h-4 w-4" /> Add service</Button>
            </CardContent>
          </Card>
          {businessType === 'coffee_shop' && (
            <Card>
              <CardHeader><CardTitle>Products</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {products.map((product, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1fr_160px_160px_40px] dark:border-slate-800">
                    <Input placeholder="Product name" value={product.name} onChange={(event) => setProducts((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                    <Input placeholder="Category" value={product.category ?? ''} onChange={(event) => setProducts((current) => current.map((item, i) => i === index ? { ...item, category: event.target.value } : item))} />
                    <Input type="number" placeholder="Price" value={product.selling_price} onChange={(event) => setProducts((current) => current.map((item, i) => i === index ? { ...item, selling_price: Number(event.target.value) } : item))} />
                    <Button size="icon" variant="outline" onClick={() => setProducts((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addProduct}><Plus className="mr-1 h-4 w-4" /> Add product</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Staff</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {staff.map((member, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1fr_140px_1fr_160px_40px] dark:border-slate-800">
                <Input placeholder="Name" value={member.full_name} onChange={(event) => setStaff((current) => current.map((item, i) => i === index ? { ...item, full_name: event.target.value } : item))} />
                <Input placeholder="Role" value={member.role} onChange={(event) => setStaff((current) => current.map((item, i) => i === index ? { ...item, role: event.target.value } : item))} />
                <Input type="email" placeholder="Email" value={member.email ?? ''} onChange={(event) => setStaff((current) => current.map((item, i) => i === index ? { ...item, email: event.target.value } : item))} />
                <Input placeholder="Phone" value={member.phone ?? ''} onChange={(event) => setStaff((current) => current.map((item, i) => i === index ? { ...item, phone: event.target.value } : item))} />
                <Button size="icon" variant="outline" onClick={() => setStaff((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={addStaff}><Plus className="mr-1 h-4 w-4" /> Add staff</Button>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>Choose modules</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {setupModuleOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => toggleModule(option.value)} className={`rounded-lg border p-4 text-left ${modules.includes(option.value) ? 'border-teal-600 bg-teal-50 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {modules.includes(option.value) && <Check className="h-4 w-4 text-teal-700" />}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Customer booking page preview</CardTitle></CardHeader>
          <CardContent>
            <div className="mx-auto max-w-md rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">LOGO</div>
                <h3 className="text-2xl font-semibold">{profileForm.name || 'Your business'}</h3>
                <p className="text-sm text-slate-500">{businessType.replaceAll('_', ' ')}</p>
              </div>
              <div className="mt-5 space-y-2">
                {services.slice(0, 4).map((service) => (
                  <div key={service.name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                    <span>{service.name || 'Service'}</span>
                    <span className="font-semibold">RM {service.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 7 && (
        <Card>
          <CardHeader><CardTitle>Finish setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{businessType.replaceAll('_', ' ')}</Badge>
              <Badge>{services.filter((item) => item.name.trim()).length} services</Badge>
              <Badge>{products.filter((item) => item.name.trim()).length} products</Badge>
              <Badge>{staff.filter((item) => item.full_name.trim()).length} staff</Badge>
              <Badge>{modules.length} modules</Badge>
            </div>
            <p className="text-sm text-slate-500">This will create your main branch, starter catalog, active staff records, selected module access, and customer booking page data.</p>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button onClick={finishSetup} disabled={saving}>{saving ? 'Finishing...' : 'Finish setup'}</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1))}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < steps.length - 1 && (
          <Button disabled={!canContinue || saving} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>
            Continue <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
