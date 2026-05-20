import { useCallback, useEffect, useMemo, useState } from 'react'
import { EyeOff, MessageSquareText, Star, TrendingUp, UserCheck } from 'lucide-react'
import { useAppContext } from '@/context/useAppContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { getReviews, getReviewStats, updateReviewStatus, getReviewDisplay, type ReviewRow, type ReviewStats, type ReviewStatus } from '@/services/reviews'
import { toastError, toastSuccess } from '@/lib/toast'

const statusVariant: Record<ReviewStatus, BadgeVariant> = {
  pending: 'warning',
  published: 'success',
  hidden: 'muted',
  flagged: 'danger',
}

function formatRating(value: number): string {
  return value ? `${value.toFixed(1)} / 5` : '0.0 / 5'
}

function ratingStars(value: number) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="font-medium">{Number(value).toFixed(1)}</span>
    </span>
  )
}

export function ReviewsPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      const [nextReviews, nextStats] = await Promise.all([
        getReviews(businessId),
        getReviewStats(businessId),
      ])
      setReviews(nextReviews)
      setStats(nextStats)
    } catch (error) {
      toastError(error, 'Failed to load reviews')
    }
  }, [businessId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const filteredReviews = useMemo(
    () => statusFilter === 'all' ? reviews : reviews.filter((review) => review.status === statusFilter),
    [reviews, statusFilter],
  )

  async function handleStatus(reviewId: string, status: ReviewStatus) {
    try {
      await updateReviewStatus(reviewId, status)
      toastSuccess(status === 'hidden' ? 'Review hidden from public display' : 'Review updated')
      await load()
    } catch (error) {
      toastError(error, 'Failed to update review')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Collect customer feedback, track ratings, and moderate public display."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Average rating" value={formatRating(stats?.averageRating ?? 0)} hint={`${stats?.totalReviews ?? 0} total reviews`} icon={Star} />
        <StatCard label="Best staff" value={stats?.bestStaff?.name ?? '-'} hint={stats?.bestStaff ? formatRating(stats.bestStaff.average) : 'No staff ratings yet'} icon={UserCheck} />
        <StatCard label="Low-rated service" value={stats?.lowRatedService?.name ?? '-'} hint={stats?.lowRatedService ? formatRating(stats.lowRatedService.average) : 'No service ratings yet'} icon={TrendingUp} />
        <StatCard label="Hidden reviews" value={String(stats?.hiddenReviews ?? 0)} hint="Not shown publicly" icon={EyeOff} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Customer feedback</CardTitle>
              <p className="text-sm text-slate-500">Owner moderation controls apply to public display status.</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'pending', 'published', 'hidden', 'flagged'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    statusFilter === status
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={[
                {
                  key: 'customer',
                  header: 'Customer',
                  render: (row) => {
                    const display = getReviewDisplay(row as unknown as ReviewRow)
                    return (
                      <div>
                        <p className="font-medium">{display.customerName}</p>
                        <p className="text-xs text-slate-500">{display.serviceName} with {display.staffName}</p>
                      </div>
                    )
                  },
                },
                { key: 'rating', header: 'Overall', render: (row) => ratingStars(Number(row.rating)) },
                { key: 'service_rating', header: 'Service', render: (row) => ratingStars(Number(row.service_rating ?? row.rating)) },
                { key: 'staff_rating', header: 'Staff', render: (row) => ratingStars(Number(row.staff_rating ?? row.rating)) },
                {
                  key: 'comment',
                  header: 'Feedback',
                  render: (row) => (
                    <div className="max-w-sm">
                      {Boolean(row.title) && <p className="font-medium">{String(row.title)}</p>}
                      <p className="line-clamp-2 text-sm text-slate-500">{String(row.comment ?? '-')}</p>
                    </div>
                  ),
                },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={statusVariant[row.status as ReviewStatus] ?? 'muted'}>{String(row.status)}</Badge> },
                {
                  key: 'actions',
                  header: '',
                  render: (row) => {
                    const review = row as unknown as ReviewRow
                    return (
                      <div className="flex flex-wrap justify-end gap-1">
                        {review.status !== 'published' && <Button size="sm" variant="outline" onClick={() => void handleStatus(review.id, 'published')}>Publish</Button>}
                        {review.status !== 'hidden' && <Button size="sm" variant="outline" onClick={() => void handleStatus(review.id, 'hidden')}>Hide</Button>}
                        {review.status !== 'flagged' && <Button size="sm" variant="outline" onClick={() => void handleStatus(review.id, 'flagged')}>Flag</Button>}
                      </div>
                    )
                  },
                },
              ]}
              data={filteredReviews as unknown as Record<string, unknown>[]}
              emptyMessage="No reviews found."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review trends</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.trends.length ? (
              <div className="space-y-3">
                {stats.trends.map((trend) => (
                  <div key={trend.date}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{new Date(trend.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                      <span className="text-slate-500">{formatRating(trend.average)} · {trend.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.max(4, (trend.average / 5) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={MessageSquareText} title="No trend data" description="Review trends appear after customers submit feedback." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
