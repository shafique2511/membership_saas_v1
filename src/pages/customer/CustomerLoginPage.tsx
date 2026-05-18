import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { useAppContext } from '@/context/useAppContext'
import { getUserProfile, signInWithEmail, signOut } from '@/services/auth'

export function CustomerLoginPage() {
  const { businessSlug } = useParams()
  const navigate = useNavigate()
  const { refreshAuth } = useAppContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: loginError } = await signInWithEmail(email, password)
    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    try {
      const profile = await getUserProfile()
      if (profile?.role !== 'customer') {
        await signOut()
        setError('This page is for customer accounts only. Use the business login page instead.')
        setLoading(false)
        return
      }

      await refreshAuth()
      navigate(`/b/${businessSlug}/portal`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center bg-white px-5 py-10 dark:bg-slate-950">
      <div className="w-full">
        <h1 className="text-2xl font-semibold">Customer sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Access memberships, points, rewards, booking history, cancellations, and rescheduling.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="Email address" description="Use the email registered with this business customer portal.">
            <Input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password" description="Enter your customer portal password.">
            <Input required type="password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link className="text-teal-700 dark:text-teal-300" to={`/b/${businessSlug}`}>
            Back to business
          </Link>
          <Link className="text-teal-700 dark:text-teal-300" to={`/b/${businessSlug}/register`}>
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
