import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, CalendarCheck, Copy, Lightbulb, Megaphone, MessageSquareText, Package, ReceiptText, RefreshCw, Scissors, TrendingUp, UserRound, Users, WalletCards, type LucideIcon } from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/StatCard'
import { toastError, toastSuccess } from '@/lib/toast'
import { answerAIAssistantPrompt, getAIAssistantSnapshot, type AIAssistantSnapshot, type AIInsight, type AIPromptKey } from '@/services/aiAssistant'
import { formatCurrency } from '@/utils/format'

const insightIcon: Record<AIInsight['type'], LucideIcon> = {
  sales: ReceiptText,
  customers: Users,
  marketing: Megaphone,
  service: Scissors,
  product: Package,
  staff: UserRound,
  booking: CalendarCheck,
  membership: WalletCards,
  report: Lightbulb,
}

const actions: { key: AIPromptKey; label: string; icon: LucideIcon }[] = [
  { key: 'today_sales', label: 'Summarize today sales', icon: ReceiptText },
  { key: 'monthly_performance', label: 'Monthly performance', icon: TrendingUp },
  { key: 'inactive_customers', label: 'Find inactive customers', icon: Users },
  { key: 'promo_campaign', label: 'Suggest promo campaign', icon: Megaphone },
  { key: 'best_service', label: 'Best-selling service', icon: Scissors },
  { key: 'best_product', label: 'Best-selling product', icon: Package },
  { key: 'staff_performance', label: 'Staff performance', icon: UserRound },
  { key: 'no_show_pattern', label: 'No-show pattern', icon: CalendarCheck },
  { key: 'membership_package', label: 'Membership package', icon: WalletCards },
  { key: 'whatsapp_promo', label: 'WhatsApp promo message', icon: MessageSquareText },
  { key: 'retention_strategy', label: 'Retention strategy', icon: Lightbulb },
  { key: 'explain_report', label: 'Explain report simply', icon: Bot },
]

function InsightCard({ insight }: { insight: AIInsight }) {
  const Icon = insightIcon[insight.type] ?? Lightbulb
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium">{insight.title}</p>
              <p className="text-xs text-slate-500">{insight.type.replace(/_/g, ' ')}</p>
            </div>
          </div>
          {insight.metric && <Badge variant="muted">{insight.metric}</Badge>}
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">{insight.summary}</p>
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{insight.recommendation}</p>
      </CardContent>
    </Card>
  )
}

export function AIAssistantPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [snapshot, setSnapshot] = useState<AIAssistantSnapshot | null>(null)
  const [selectedAction, setSelectedAction] = useState<AIPromptKey>('today_sales')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [answering, setAnswering] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      setSnapshot(await getAIAssistantSnapshot(businessId))
    } catch (error) {
      toastError(error, 'Failed to load AI insights')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const selectedLabel = useMemo(
    () => actions.find((action) => action.key === selectedAction)?.label ?? 'AI insight',
    [selectedAction],
  )

  async function handleRun(actionKey = selectedAction) {
    if (!businessId) return
    setSelectedAction(actionKey)
    setAnswering(true)
    try {
      setAnswer(await answerAIAssistantPrompt(businessId, actionKey))
    } catch (error) {
      toastError(error, 'Failed to generate insight')
    } finally {
      setAnswering(false)
    }
  }

  async function handleCopy() {
    if (!answer) return
    await navigator.clipboard.writeText(answer)
    toastSuccess('Copied')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Business insights generated from this business workspace."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4" />Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today sales" value={formatCurrency(snapshot?.quickStats.todaySales ?? 0)} hint="Current business only" icon={ReceiptText} />
        <StatCard label="Month sales" value={formatCurrency(snapshot?.quickStats.monthSales ?? 0)} hint="Current month" icon={TrendingUp} />
        <StatCard label="Inactive customers" value={String(snapshot?.quickStats.inactiveCustomers ?? 0)} hint="Last 60 days" icon={Users} />
        <StatCard label="No-shows" value={String(snapshot?.quickStats.noShows90Days ?? 0)} hint="Last 90 days" icon={CalendarCheck} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Insights</h2>
            {snapshot?.generatedAt && <p className="text-xs text-slate-500">{new Date(snapshot.generatedAt).toLocaleString()}</p>}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {(snapshot?.insights ?? []).map((insight) => <InsightCard key={insight.id} insight={insight} />)}
            {!loading && !snapshot?.insights.length && (
              <Card><CardContent className="p-6 text-sm text-slate-500">No insights are available yet.</CardContent></Card>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ask AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                {actions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => void handleRun(action.key)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedAction === action.key
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">{selectedLabel}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => void handleCopy()} disabled={!answer}><Copy className="h-4 w-4" />Copy</Button>
            </CardHeader>
            <CardContent>
              <div className="min-h-36 rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-slate-800 dark:bg-slate-950">
                {answering ? 'Generating...' : answer || 'Select an AI action to generate an answer.'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
