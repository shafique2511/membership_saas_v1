import { CalendarDays, Gift, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CustomerHomePage() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-teal-700 p-5 text-white">
        <p className="text-sm text-teal-100">Welcome back</p>
        <h2 className="mt-1 text-2xl font-semibold">Nadia</h2>
        <p className="mt-3 text-sm text-teal-50">VIP Coffee Pass active until 28 Jun 2026.</p>
      </section>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Book', icon: CalendarDays },
          { label: 'Member', icon: WalletCards },
          { label: 'Rewards', icon: Gift },
        ].map((item) => (
          <Button key={item.label} variant="secondary" className="h-20 flex-col">
            <item.icon className="h-5 w-5" />
            {item.label}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Next booking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">Table for two</p>
          <p className="mt-1 text-sm text-slate-500">Today, 4:30 PM</p>
        </CardContent>
      </Card>
    </div>
  )
}
