import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, HardDrive, RefreshCw, Server, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getSystemHealthSnapshot, retrySystemJob, type HealthStatus, type SystemHealthSnapshot, type SystemJobRow } from '@/services/admin'

function HealthIcon({ status }: { status: HealthStatus }) {
  if (status === 'healthy') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-600" />
  return <XCircle className="h-4 w-4 text-red-600" />
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HealthCard({ title, value, status, hint }: { title: string; value: string | number; status: HealthStatus; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
          </div>
          <HealthIcon status={status} />
        </div>
      </CardContent>
    </Card>
  )
}

export function SystemHealthPage() {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSnapshot(await getSystemHealthSnapshot())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function handleRetry(job: SystemJobRow) {
    setRetryingJobId(job.id)
    try {
      await retrySystemJob(job.id)
      await load()
    } finally {
      setRetryingJobId(null)
    }
  }

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <PageHeader title="System health" description="Loading platform health checks..." />
        <div className="py-16 text-center text-sm text-slate-500">{loading ? 'Checking system health...' : 'Unable to load health data.'}</div>
      </div>
    )
  }

  const checks = [
    { key: 'api', label: 'API status', status: snapshot.apiStatus },
    { key: 'supabase', label: 'Supabase connection', status: snapshot.supabaseConnectionStatus },
    { key: 'database', label: 'Database usage', status: snapshot.indicators.database, value: snapshot.databaseUsage, icon: Database },
    { key: 'storage', label: 'Storage usage', status: snapshot.indicators.storage, value: snapshot.storageUsage, icon: HardDrive },
    { key: 'backups', label: 'Backup status', status: snapshot.backupStatus },
    { key: 'jobs', label: 'Recent failed jobs', status: snapshot.indicators.jobs },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="System health"
        description="Super Admin overview for platform usage, failures, backups, jobs, and Supabase connectivity."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HealthCard title="Total businesses" value={snapshot.totalBusinesses} status={snapshot.indicators.businesses} />
        <HealthCard title="Active users" value={snapshot.activeUsers} status={snapshot.indicators.users} />
        <HealthCard title="Failed payments" value={snapshot.failedPayments} status={snapshot.indicators.failedPayments} hint="Last 7 days" />
        <HealthCard title="Failed notifications" value={snapshot.failedNotifications} status={snapshot.indicators.failedNotifications} hint="Last 7 days" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => {
          const Icon = check.icon ?? Server
          return (
            <Card key={check.key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {check.label}
                  </span>
                  <StatusBadge status={check.status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{check.value ?? check.status}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Error logs</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.recentErrors.length ? (
              <DataTable
                columns={[
                  { key: 'severity', header: 'Severity', render: (row) => <StatusBadge status={String(row.severity)} /> },
                  { key: 'source', header: 'Source' },
                  { key: 'message', header: 'Message', render: (row) => <span className="line-clamp-2">{String(row.message)}</span> },
                  { key: 'created_at', header: 'Time', render: (row) => formatDate(String(row.created_at)) },
                ]}
                data={snapshot.recentErrors as unknown as Record<string, unknown>[]}
              />
            ) : (
              <EmptyState title="No unresolved errors" description="System errors logged by health checks and platform jobs will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent failed jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.recentFailedJobs.length ? (
              <DataTable
                columns={[
                  { key: 'job_type', header: 'Job' },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
                  { key: 'attempts', header: 'Attempts', render: (row) => `${String(row.attempts)} / ${String(row.max_attempts)}` },
                  { key: 'last_error', header: 'Error', render: (row) => <span className="line-clamp-2">{String(row.last_error ?? '-')}</span> },
                  {
                    key: 'id',
                    header: '',
                    render: (row) => {
                      const job = row as unknown as SystemJobRow
                      return (
                        <Button size="sm" variant="outline" disabled={retryingJobId === job.id || job.status === 'retrying'} onClick={() => void handleRetry(job)}>
                          {retryingJobId === job.id ? 'Retrying...' : 'Retry'}
                        </Button>
                      )
                    },
                  },
                ]}
                data={snapshot.recentFailedJobs as unknown as Record<string, unknown>[]}
              />
            ) : (
              <EmptyState title="No failed jobs" description="Failed background work will appear here with a retry action." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent backup status</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.recentBackups.length ? (
            <DataTable
              columns={[
                { key: 'request_type', header: 'Type', render: (row) => <Badge>{String(row.request_type)}</Badge> },
                { key: 'scope', header: 'Scope' },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
                { key: 'created_at', header: 'Created', render: (row) => formatDate(String(row.created_at)) },
                { key: 'ready_at', header: 'Ready', render: (row) => formatDate(String(row.ready_at ?? '')) },
              ]}
              data={snapshot.recentBackups as unknown as Record<string, unknown>[]}
            />
          ) : (
            <EmptyState title="No backup requests" description="Recent platform and business backup requests will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
