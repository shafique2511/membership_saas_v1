import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Coins, CreditCard, Gift, Package, ShoppingCart, UsersRound } from 'lucide-react'

const modules = [
  { label: 'Booking', icon: CalendarDays },
  { label: 'Membership', icon: CreditCard },
  { label: 'Loyalty', icon: Gift },
  { label: 'POS', icon: ShoppingCart },
  { label: 'Inventory', icon: Package },
  { label: 'Customers', icon: UsersRound },
]

const packages = [
  { name: 'Starter', price: 'RM 99', detail: 'Core CRM, bookings, and customer portal.' },
  { name: 'Growth', price: 'RM 199', detail: 'Memberships, loyalty, payments, and reports.' },
  { name: 'Business Suite', price: 'RM 399', detail: 'POS, inventory, staff, branches, and automation.' },
]

export function PublicHomePage() {
  return (
    <div className="bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden bg-[url('https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-[1fr_460px]">
          <div className="max-w-3xl text-white">
            <Badge className="bg-teal-500/90 text-white hover:bg-teal-500">Luxantara Members</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
              Membership, booking, POS, and loyalty tools for service businesses.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
              Run customer memberships, appointment bookings, prepaid credit, reward points, POS checkout, inventory, staff permissions, and reports from one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register-business"><Button size="lg">Start free trial</Button></Link>
              <Link to="/login"><Button size="lg" variant="secondary">Login</Button></Link>
              <a href="https://wa.me/" target="_blank" rel="noreferrer"><Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">WhatsApp</Button></a>
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/95 p-4 shadow-2xl dark:bg-slate-900/95">
            <div className="mb-4 flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500">Today</p>
                <h2 className="font-semibold text-slate-950 dark:text-white">Business dashboard</h2>
              </div>
              <Badge>Live</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Bookings', '34'],
                ['Sales', 'RM 4,280'],
                ['Members', '1,248'],
                ['Points issued', '18,420'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border p-3 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Coins className="h-4 w-4 text-teal-600" /> Customer activity</div>
              <div className="space-y-2 text-sm text-slate-500">
                <div className="flex justify-between"><span>Classic haircut membership used</span><span>10:30</span></div>
                <div className="flex justify-between"><span>Latte sale completed</span><span>10:42</span></div>
                <div className="flex justify-between"><span>Reward points earned</span><span>10:45</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">The problem</p>
            <h2 className="mt-2 text-3xl font-semibold">Customer data, payments, points, and stock should not live in separate notebooks.</h2>
          </div>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300 lg:col-span-2">
            Luxantara Members connects the day-to-day workflow: customers book, staff serve, POS records payment, inventory updates, points are earned, memberships deduct balance, and reports stay current.
          </p>
        </div>
      </section>

      <section className="border-y bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-semibold">Modules</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div key={module.label} className="rounded-lg border bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <module.icon className="h-5 w-5 text-teal-600" />
                <h3 className="mt-3 font-semibold">{module.label}</h3>
                <p className="mt-2 text-sm text-slate-500">Enable only the tools each business package should access.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Pricing packages</p>
            <h2 className="mt-2 text-3xl font-semibold">Plans for growing operators</h2>
          </div>
          <Link to="/pricing"><Button variant="outline">View pricing</Button></Link>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {packages.map((item) => (
            <div key={item.name} className="rounded-lg border p-6 dark:border-slate-800">
              <h3 className="text-xl font-semibold">{item.name}</h3>
              <p className="mt-2 text-3xl font-bold">{item.price}</p>
              <p className="mt-3 text-sm text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold">Barber shop workflow</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">Sell haircut memberships, assign staff, prevent slot conflicts, record payments, issue loyalty points, and track commission.</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Coffee shop workflow</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">Run POS orders, deduct stock, manage prepaid credit, reward repeat visits, and view daily closing reports.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['Can customers book without logging in?', 'Yes. Login is only needed for membership, points, rewards, booking history, cancellation, and rescheduling.'],
            ['Are customer and business logins separate?', 'Yes. Business users use /login. Customers use the business portal login under /b/{businessSlug}/login.'],
            ['Can modules be hidden?', 'Yes. Disabled modules are hidden from navigation and protected by backend rules.'],
            ['Does it support multiple business types?', 'Yes. Barber shops, coffee shops, clinics, salons, spas, event spaces, and custom businesses are supported.'],
          ].map(([question, answer]) => (
            <div key={question} className="rounded-lg border p-5 dark:border-slate-800">
              <h3 className="font-semibold">{question}</h3>
              <p className="mt-2 text-sm text-slate-500">{answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
