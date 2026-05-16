import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '@/context/useAppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarketingTabs } from './MarketingTabs'
import { getCampaignResults, getCampaigns, type CampaignResult } from '@/services/marketing'
import { formatCurrency } from '@/utils/format'

export function CampaignReportPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [results, setResults] = useState<(CampaignResult & { campaign_name?: string })[]>([])
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; status: string; campaign_type: string }[]>([])

  const load = useCallback(async () => {
    if (!businessId) return
    const [r, c] = await Promise.all([getCampaignResults(businessId), getCampaigns(businessId)])
    setResults(r)
    setCampaigns(c.map((camp) => ({ id: camp.id, name: camp.name, status: camp.status, campaign_type: camp.campaign_type })))
  }, [businessId])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  const totalReached = results.reduce((s, r) => s + r.total_reached, 0)
  const totalConverted = results.reduce((s, r) => s + r.total_converted, 0)
  const totalRevenue = results.reduce((s, r) => s + Number(r.total_revenue), 0)
  const totalSent = campaigns.filter((c) => c.status === 'sent').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Campaign Report</h2>
        <p className="text-sm text-slate-500">Performance analytics for marketing campaigns.</p>
      </div>
      <MarketingTabs />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Campaigns Sent</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalSent}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Reached</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalReached}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Conversions</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalConverted}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Campaign results</CardTitle></CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((r) => (
                <div key={r.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{r.campaign_name ?? 'Unknown campaign'}</h4>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Reached:</span> <span className="font-medium">{r.total_reached}</span></div>
                    <div><span className="text-muted-foreground">Opened:</span> <span className="font-medium">{r.total_opened}</span></div>
                    <div><span className="text-muted-foreground">Clicked:</span> <span className="font-medium">{r.total_clicked}</span></div>
                    <div><span className="text-muted-foreground">Converted:</span> <span className="font-medium">{r.total_converted}</span></div>
                    <div className="col-span-4"><span className="text-muted-foreground">Revenue:</span> <span className="font-medium">{formatCurrency(Number(r.total_revenue))}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No campaign results yet. Results are populated after sending campaigns.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Campaign history</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{c.name}</td>
                    <td className="py-2 capitalize">{c.campaign_type.replace(/_/g, ' ')}</td>
                    <td className="py-2 capitalize">{c.status}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No campaigns yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
