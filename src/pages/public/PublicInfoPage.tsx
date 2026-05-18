import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const content = {
  features: {
    title: 'Features',
    subtitle: 'Everything needed for booking, membership, loyalty, POS, inventory, staff, payments, and reporting.',
    items: ['Role-based dashboards', 'Module-aware navigation', 'Customer portal', 'Package and usage controls', 'Audit-friendly business records', 'Mobile-first customer experience'],
  },
  pricing: {
    title: 'Pricing',
    subtitle: 'Simple packages that can map to enabled modules and business usage limits.',
    items: ['Starter for core booking', 'Growth for memberships and loyalty', 'Business Suite for POS, inventory, branches, and reports'],
  },
  demo: {
    title: 'Demo',
    subtitle: 'Preview how a business owner, staff member, and customer move through the system.',
    items: ['Owner dashboard', 'Booking calendar', 'POS checkout', 'Customer membership portal'],
  },
  contact: {
    title: 'Contact',
    subtitle: 'Talk to Luxantara Members about setup, onboarding, migration, and support.',
    items: ['WhatsApp support', 'Business onboarding', 'Data migration planning', 'Deployment assistance'],
  },
}

export function PublicInfoPage({ page }: { page: keyof typeof content }) {
  const data = content[page]

  return (
    <div className="min-h-screen bg-white px-6 py-16 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm text-teal-700 dark:text-teal-300" to="/">Back to home</Link>
        <h1 className="mt-6 text-4xl font-semibold">{data.title}</h1>
        <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-300">{data.subtitle}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {data.items.map((item) => (
            <div key={item} className="rounded-lg border p-5 dark:border-slate-800">
              <h2 className="font-semibold">{item}</h2>
              <p className="mt-2 text-sm text-slate-500">Configured for production SaaS workflows with permissions, module access, and responsive layouts.</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex gap-3">
          <Link to="/register-business"><Button>Start free trial</Button></Link>
          <Link to="/login"><Button variant="outline">Login</Button></Link>
        </div>
      </div>
    </div>
  )
}
