import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function PlatformSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description="Global defaults for billing, trials, support, and platform behavior." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Billing defaults</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue="14" placeholder="Default trial days" />
            <Input defaultValue="MYR" placeholder="Currency" />
            <Input defaultValue="Asia/Kuala_Lumpur" placeholder="Default timezone" />
            <Button>Save billing settings</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Platform controls</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Allow owner self-registration</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Require module access checks</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Track usage limits</label>
            <Button>Save platform settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
