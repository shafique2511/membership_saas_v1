import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, Eye, Play, RefreshCw } from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { NotificationTabs } from './NotificationTabs'
import {
  getRetentionLogs,
  getRetentionRules,
  runRetentionRule,
  seedRetentionAutomation,
  updateRetentionRule,
  type RetentionAutomationLog,
  type RetentionAutomationRule,
  type RetentionRunResult,
} from '@/services/retentionAutomation'

const statusVariant: Record<string, BadgeVariant> = {
  previewed: 'warning',
  sent: 'default',
  skipped: 'muted',
  failed: 'danger',
}

function formatCondition(config: Record<string, unknown>) {
  return Object.entries(config)
    .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value)}`)
    .join(' | ')
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

export function RetentionAutomationPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [rules, setRules] = useState<RetentionAutomationRule[]>([])
  const [logs, setLogs] = useState<RetentionAutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<RetentionRunResult | null>(null)

  const enabledCount = useMemo(() => rules.filter((rule) => rule.is_enabled).length, [rules])

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const [nextRules, nextLogs] = await Promise.all([
        getRetentionRules(businessId),
        getRetentionLogs(businessId),
      ])
      setRules(nextRules)
      setLogs(nextLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load retention automation.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function handleSeed() {
    if (!businessId) return
    setError(null)
    try {
      await seedRetentionAutomation(businessId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default automation rules.')
    }
  }

  async function handleToggle(rule: RetentionAutomationRule) {
    setBusyRuleId(rule.id)
    setError(null)
    try {
      await updateRetentionRule(rule.id, { is_enabled: !rule.is_enabled })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update automation rule.')
    } finally {
      setBusyRuleId(null)
    }
  }

  async function handleRun(ruleId: string, preview: boolean) {
    setBusyRuleId(ruleId)
    setError(null)
    try {
      const result = await runRetentionRule(ruleId, preview)
      setLastResult(result)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run automation rule.')
    } finally {
      setBusyRuleId(null)
    }
  }

  if (loading) {
    return <LoadingState label="Loading retention automation..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Retention automation</h2>
          <p className="text-sm text-muted-foreground">
            Preview and send customer retention messages from notification templates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => void handleSeed()}>
            <BellRing className="mr-2 h-4 w-4" />
            Create default rules
          </Button>
        </div>
      </div>

      <NotificationTabs />

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{rules.length}</div>
            <p className="text-sm text-muted-foreground">{enabledCount} enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest run</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{lastResult?.processed ?? 0}</div>
            <p className="text-sm text-muted-foreground">
              {lastResult ? `${lastResult.sent} sent, ${lastResult.skipped} skipped, ${lastResult.failed} failed` : 'No manual run this session'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Logs</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{logs.length}</div>
            <p className="text-sm text-muted-foreground">Latest automation actions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">No retention rules yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Create the default rules to start with inactive, birthday, no-show, first-visit, membership expiry, and VIP triggers.</p>
              <Button className="mt-4" onClick={() => void handleSeed()}>Create default rules</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Rule</th>
                    <th className="pb-2 font-medium">Trigger</th>
                    <th className="pb-2 font-medium">Condition</th>
                    <th className="pb-2 font-medium">Channel</th>
                    <th className="pb-2 font-medium">Last run</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b last:border-0">
                      <td className="py-3 align-top">
                        <div className="font-medium">{rule.name}</div>
                        <div className="mt-1 max-w-xs text-xs text-muted-foreground">{rule.description}</div>
                        <Badge className="mt-2" variant={rule.is_enabled ? 'default' : 'muted'}>
                          {rule.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="py-3 align-top capitalize">{rule.trigger_type}</td>
                      <td className="py-3 align-top text-xs text-muted-foreground">{formatCondition(rule.condition_config)}</td>
                      <td className="py-3 align-top capitalize">{rule.channel}</td>
                      <td className="py-3 align-top">{formatDate(rule.last_run_at)}</td>
                      <td className="py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyRuleId === rule.id}
                            onClick={() => void handleToggle(rule)}
                          >
                            {rule.is_enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!rule.is_enabled || busyRuleId === rule.id}
                            onClick={() => void handleRun(rule.id, true)}
                          >
                            <Eye className="mr-1.5 h-4 w-4" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            disabled={!rule.is_enabled || busyRuleId === rule.id}
                            onClick={() => void handleRun(rule.id, false)}
                          >
                            <Play className="mr-1.5 h-4 w-4" />
                            Send
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Rule</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Recipient</th>
                  <th className="pb-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="py-2">{log.rule?.name ?? 'Rule removed'}</td>
                    <td className="py-2">{log.customer?.full_name ?? 'N/A'}</td>
                    <td className="py-2">
                      <Badge variant={statusVariant[log.status] ?? 'muted'}>{log.status}</Badge>
                    </td>
                    <td className="py-2">{log.recipient ?? '-'}</td>
                    <td className="py-2 max-w-md text-xs text-muted-foreground">{log.reason ?? log.message_preview ?? 'Logged automation action.'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">No automation logs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
