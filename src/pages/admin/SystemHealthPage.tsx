import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { supabase } from '@/lib/supabase'

export function SystemHealthPage() {
  const [checks, setChecks] = useState<Record<string, string>>({
    auth: 'checking',
    database: 'checking',
    storage: 'checking',
  })

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const next: Record<string, string> = {}
      const userResult = await supabase.auth.getUser()
      next.auth = userResult.error ? 'warning' : 'healthy'

      const dbResult = await supabase.from('businesses').select('id', { count: 'exact', head: true })
      next.database = dbResult.error ? 'warning' : 'healthy'

      const storageResult = await supabase.storage.listBuckets()
      next.storage = storageResult.error ? 'warning' : 'healthy'
      setChecks(next)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader title="System health" description="Lightweight checks for auth, database, and storage connectivity." />
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(checks).map(([name, status]) => (
          <Card key={name}>
            <CardHeader><CardTitle className="capitalize">{name}</CardTitle></CardHeader>
            <CardContent><StatusBadge status={status} /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
