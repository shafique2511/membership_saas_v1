import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/LoadingState'
import { toastError, toastSuccess } from '@/lib/toast'
import { getPublicBusinessBySlug, type PublicBusiness } from '@/services/customerPortal'
import { submitPublicReview } from '@/services/qrCodes'
import { getPublicReviewContext, type ReviewContext } from '@/services/reviews'
import { cn } from '@/lib/utils'

function RatingPicker({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map((nextValue) => (
        <button
          key={nextValue}
          type="button"
          onClick={() => onChange(nextValue)}
          className={cn(
            'rounded-full p-2 transition-colors',
            nextValue <= value ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400',
          )}
          aria-label={`${label}: ${nextValue} star rating`}
        >
          <Star className={cn('h-8 w-8', nextValue <= value ? 'fill-current' : '')} />
        </button>
      ))}
    </div>
  )
}

export function CustomerReviewPage() {
  const { businessSlug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<PublicBusiness | null>(null)
  const [context, setContext] = useState<ReviewContext | null>(null)
  const [rating, setRating] = useState(5)
  const [staffRating, setStaffRating] = useState(5)
  const [serviceRating, setServiceRating] = useState(5)
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const load = useCallback(async () => {
    if (!businessSlug) return
    setLoading(true)
    try {
      const nextBusiness = await getPublicBusinessBySlug(businessSlug)
      setBusiness(nextBusiness)
      if (nextBusiness) {
        const bookingId = searchParams.get('booking')
        const posOrderId = searchParams.get('order')
        if (bookingId || posOrderId) {
          const nextContext = await getPublicReviewContext(nextBusiness.id, { bookingId, posOrderId })
          setContext(nextContext)
          if (nextContext) {
            setCustomerName(nextContext.customer_name ?? '')
            setPhone(nextContext.customer_phone ?? '')
            setEmail(nextContext.customer_email ?? '')
          }
        }
      }
    } catch (error) {
      toastError(error, 'Failed to load business')
    } finally {
      setLoading(false)
    }
  }, [businessSlug, searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!business) return
    setSaving(true)
    try {
      await submitPublicReview({
        businessId: business.id,
        rating,
        staffRating,
        serviceRating,
        bookingId: context?.booking_id ?? searchParams.get('booking'),
        posOrderId: context?.pos_order_id ?? searchParams.get('order'),
        title,
        comment,
        customerName,
        phone,
        email,
      })
      setSubmitted(true)
      toastSuccess('Review submitted')
    } catch (error) {
      toastError(error, 'Failed to submit review')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white p-4 dark:from-teal-950 dark:to-slate-950">
        <LoadingState label="Loading review page..." />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white p-4 dark:from-teal-950 dark:to-slate-950">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="font-medium">Business not found</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Go home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white px-4 py-6 dark:from-teal-950 dark:to-slate-950">
      <div className="mx-auto max-w-md">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(`/b/${businessSlug}`)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white font-semibold shadow-sm dark:bg-slate-900">
            {business.logo_url ? <img src={business.logo_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : 'LM'}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Share your visit experience</p>
        </div>

        <Card>
          <CardContent className="p-5">
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200">
                  <Star className="h-6 w-6 fill-current" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Thank you</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Your review has been submitted for the team.</p>
                </div>
                <Button className="w-full" onClick={() => navigate(`/b/${businessSlug}`)}>Return to business page</Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                {context && (
                  <div className="rounded-md border border-teal-100 bg-teal-50 p-3 text-sm dark:border-teal-900 dark:bg-teal-950/30">
                    <p className="font-medium">Reviewing your completed {context.source === 'booking' ? 'booking' : 'order'}</p>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {context.service_name && <p>Service: {context.service_name}</p>}
                      {context.staff_name && <p>Staff: {context.staff_name}</p>}
                    </div>
                  </div>
                )}

                <Field label="Overall rating" description="Choose how satisfied you were with the visit.">
                  <RatingPicker value={rating} onChange={setRating} label="Overall rating" />
                </Field>

                <Field label="Service rating" description="Rate the service or order experience.">
                  <RatingPicker value={serviceRating} onChange={setServiceRating} label="Service rating" />
                </Field>

                <Field label="Staff rating" description="Rate the staff experience.">
                  <RatingPicker value={staffRating} onChange={setStaffRating} label="Staff rating" />
                </Field>

                <Field label="Name" description="Optional, but helpful if the team needs to follow up." htmlFor="reviewName">
                  <Input id="reviewName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Your name" />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Phone" htmlFor="reviewPhone">
                    <Input id="reviewPhone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+60..." />
                  </Field>
                  <Field label="Email" htmlFor="reviewEmail">
                    <Input id="reviewEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                  </Field>
                </div>

                <Field label="Review title" htmlFor="reviewTitle">
                  <Input id="reviewTitle" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Great haircut" />
                </Field>

                <Field label="Comment" description="Tell the team what went well or what should improve." htmlFor="reviewComment">
                  <textarea
                    id="reviewComment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-600 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                    placeholder="Write your feedback..."
                  />
                </Field>

                <Button className="w-full" type="submit" disabled={saving}>
                  Submit review
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
