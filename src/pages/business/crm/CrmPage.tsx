import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { useAppContext } from '@/context/useAppContext'
import { defaultCrmTags, getCrmCustomers, type CrmCustomer, type CrmSegment } from '@/services/crm'
import { formatCurrency } from '@/utils/format'

const segmentOptions: { value: CrmSegment; label: string }[] = [
  { value: 'all', label: 'All customers' },
  { value: 'inactive', label: 'Inactive customers' },
  { value: 'vip', label: 'VIP customers' },
  { value: 'birthday', label: 'Birthday this month' },
  { value: 'high_spender', label: 'High spenders' },
  { value: 'no_show', label: 'No-show customers' },
]

export function CrmPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [segment, setSegment] = useState<CrmSegment>('all')
  const [search, setSearch] = useState('')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [highSpenderMin, setHighSpenderMin] = useState(1000)

  const load = useCallback(async () => {
    if (!businessId) return
    setCustomers(await getCrmCustomers(businessId, { segment, search, inactiveDays, highSpenderMin }))
  }, [businessId, highSpenderMin, inactiveDays, search, segment])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const stats = useMemo(() => {
    const birthday = customers.filter((customer) => customer.birthday?.slice(5, 7) === String(new Date().getMonth() + 1).padStart(2, '0')).length
    return {
      total: customers.length,
      vip: customers.filter((customer) => customer.total_spent >= highSpenderMin || customer.tags.some((tag) => tag.tag.toLowerCase() === 'vip')).length,
      inactive: customers.filter((customer) => !customer.last_visit || customer.last_visit < new Date(Date.now() - inactiveDays * 86400000).toISOString().slice(0, 10)).length,
      birthday,
      noShow: customers.filter((customer) => customer.no_show_count > 0).length,
    }
  }, [customers, highSpenderMin, inactiveDays])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Simple CRM</h2>
          <p className="text-sm text-slate-500">Customer retention lists, tags, notes, and customer value tracking.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Customers</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">VIP</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{stats.vip}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Inactive</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{stats.inactive}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Birthdays</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-pink-600">{stats.birthday}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">No-show</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{stats.noShow}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Field label="Search" description="Find by name, phone, or email.">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer name" />
          </Field>
          <Field label="List" description="Retention list to view.">
            <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={segment} onChange={(e) => setSegment(e.target.value as CrmSegment)}>
              {segmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Inactive days" description="Days without completed visit before inactive.">
            <Input type="number" value={inactiveDays} onChange={(e) => setInactiveDays(Number(e.target.value))} />
          </Field>
          <Field label="High spender" description="Minimum lifetime value for high spender lists.">
            <Input type="number" value={highSpenderMin} onChange={(e) => setHighSpenderMin(Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {defaultCrmTags.map((tag) => (
              <Badge key={tag.tag} variant="muted" style={{ borderColor: tag.color, color: tag.color }} className="border">
                {tag.tag}
              </Badge>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Tags</th>
                  <th className="pb-2 font-medium">Last Visit</th>
                  <th className="pb-2 font-medium">Favorite Service</th>
                  <th className="pb-2 font-medium">Favorite Product</th>
                  <th className="pb-2 font-medium">Lifetime Value</th>
                  <th className="pb-2 font-medium">Visits</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-300" to={`/business/customers/${customer.id}`}>{customer.full_name}</Link>
                      <p className="text-xs text-muted-foreground">{customer.phone ?? customer.email ?? 'No contact'}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {customer.tags.length ? customer.tags.map((tag) => <Badge key={tag.id} variant="muted">{tag.tag}</Badge>) : <span className="text-muted-foreground">-</span>}
                      </div>
                    </td>
                    <td className="py-3">{customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : 'Never'}</td>
                    <td className="py-3">{customer.favorite_service ?? '-'}</td>
                    <td className="py-3">{customer.favorite_product ?? '-'}</td>
                    <td className="py-3">{formatCurrency(customer.lifetime_value)}</td>
                    <td className="py-3">{customer.visit_count}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No customers match this CRM list.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => void load()}>Refresh</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
