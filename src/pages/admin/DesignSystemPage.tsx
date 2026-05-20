import { useState } from 'react'
import { CalendarDays, Check, Coffee, Scissors, Sparkles } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { UpgradePrompt } from '@/components/modules/UpgradePrompt'
import { PackageComparison } from '@/components/modules/PackageComparison'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarStrip } from '@/components/ui/CalendarStrip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartCard } from '@/components/ui/ChartCard'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { FormModal } from '@/components/ui/FormModal'
import { Input } from '@/components/ui/input'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { QrPreviewCard } from '@/components/ui/QrPreviewCard'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tabs } from '@/components/ui/tabs'
import { UsageMeter } from '@/components/ui/UsageMeter'
import { toastSuccess } from '@/lib/toast'
import { designPrinciples, designTokens } from '@/styles/designSystem'

const tableRows = [
  { customer: 'Amin Rahman', service: 'Haircut + Beard', status: 'confirmed', amount: 'RM 45' },
  { customer: 'Mei Lin', service: 'Signature Latte Set', status: 'paid', amount: 'RM 28' },
  { customer: 'Daniel Tan', service: 'Membership renewal', status: 'warning', amount: 'RM 180' },
]

const chartRows = [
  { day: 'Mon', sales: 40 },
  { day: 'Tue', sales: 72 },
  { day: 'Wed', sales: 56 },
  { day: 'Thu', sales: 88 },
  { day: 'Fri', sales: 64 },
  { day: 'Sat', sales: 92 },
  { day: 'Sun', sales: 76 },
]

export function DesignSystemPage() {
  const [tab, setTab] = useState('overview')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design system"
        description="Reusable UI rules and components for Luxantara Members dashboards, mobile owner workflows, and customer portals."
        actions={<Button onClick={() => toastSuccess('Toast notification preview')}>Show Toast</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Direction</CardTitle>
          <CardDescription>Modern SaaS, clean dashboard, mobile responsive, simple for non-technical business owners.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {designPrinciples.map((principle) => (
              <p key={principle} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-700 dark:text-emerald-300" />{principle}</p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Primary', designTokens.colors.primary.light],
              ['Emerald', designTokens.colors.accent.emerald],
              ['Gold', designTokens.colors.accent.gold],
              ['Charcoal', designTokens.colors.surface.charcoal],
            ].map(([label, color]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="h-12 rounded-md" style={{ background: color }} />
                <p className="mt-2 text-sm font-medium">{label}</p>
                <p className="text-xs text-slate-500">{color}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'overview', label: 'Overview', icon: <Sparkles className="h-4 w-4" /> },
          { value: 'barber', label: 'Barber', icon: <Scissors className="h-4 w-4" /> },
          { value: 'coffee', label: 'Coffee', icon: <Coffee className="h-4 w-4" /> },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
            <CardDescription>Compact surfaces for dashboard metrics and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">RM 2,840</p>
            <p className="mt-1 text-sm text-slate-500">Today sales</p>
          </CardContent>
        </Card>
        <ChartCard title="Charts" description="Simple operational trends">
          <BarChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <Bar dataKey="sales" fill="#047857" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status language is consistent across modules.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <StatusBadge status="healthy" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forms, dropdowns, modals, calendar</CardTitle>
          <CardDescription>Minimal typing, clear labels, and large mobile-friendly controls.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Customer" description="Plain language labels help owners complete forms quickly.">
              <Input placeholder="Search customer name or phone" />
            </Field>
            <Field label="Business type" description="Dropdowns are used for fixed option sets.">
              <Select defaultValue={tab}>
                <option value="overview">General service business</option>
                <option value="barber">Barber shop</option>
                <option value="coffee">Coffee shop</option>
              </Select>
            </Field>
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          </div>
          <CalendarStrip selectedDate={date} onDateChange={setDate} />
        </CardContent>
      </Card>

      <DataTable
        columns={[
          { key: 'customer', header: 'Customer' },
          { key: 'service', header: 'Service' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'amount', header: 'Amount' },
        ]}
        data={tableRows}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Usage meters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageMeter label="Bookings" used={72} limit={100} showPercentage />
            <UsageMeter label="WhatsApp" used={460} limit={500} showPercentage />
          </CardContent>
        </Card>
        <QrPreviewCard title="QR preview card" description="Membership, booking, review, and table QR cards share one preview pattern." code="luxantara:membership:demo" />
        <EmptyState icon={CalendarDays} title="Empty states" description="Clear recovery text and a direct action keep owners moving." actionLabel="Create booking" onAction={() => setModalOpen(true)} />
      </div>

      <UpgradePrompt moduleKey="ai_assistant" moduleName="AI Assistant module" />

      <Card>
        <CardHeader>
          <CardTitle>Loading skeletons</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton variant="list" count={3} />
        </CardContent>
      </Card>

      <PackageComparison />

      <FormModal open={modalOpen} title="Modal example" description="Modals are used for focused data entry." submitLabel="Save" onSubmit={() => setModalOpen(false)} onOpenChange={setModalOpen}>
        <div className="space-y-3">
          <Field label="Booking name" description="Use concise descriptions in compact panels.">
            <Input placeholder="Walk-in haircut" />
          </Field>
          <Field label="Date" description="Date input remains native and mobile-friendly.">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
      </FormModal>
    </div>
  )
}
