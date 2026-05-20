import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { useAppContext } from '@/context/useAppContext'
import { getUserProfile, signInWithEmail } from '@/services/auth'
import { demoCredentials, signInDemoBusiness, type DemoBusinessKey } from '@/services/demo'

function getPostLoginPath(role: string | undefined) {
  switch (role) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'staff':
      return '/app/staff/dashboard'
    case 'owner':
    case 'manager':
      return '/app/dashboard'
    case 'customer':
      return '/auth/unauthorized'
    default:
      return '/business'
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshAuth } = useAppContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function finishLogin() {
    const profile = await getUserProfile()
    await refreshAuth()
    const from = (location.state as { from?: string } | null)?.from ?? getPostLoginPath(profile?.role)
    navigate(from, { replace: true })
  }

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

    await finishLogin()
    setLoading(false)
  }

  async function handleDemoLogin(key: DemoBusinessKey) {
    setLoading(true)
    setError(null)
    const { error: loginError } = await signInDemoBusiness(key)

    if (loginError) {
      setError(`${loginError.message}. Demo users may need to be seeded in Supabase.`)
      setLoading(false)
      return
    }

    await finishLogin()
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-500">Access your business workspace.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Email address" description="Use the email registered for your owner, staff, customer, or super admin account.">
          <Input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" description="Enter the password for this account.">
          <Input required type="password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link className="text-teal-700 dark:text-teal-300" to="/auth/forgot-password">
          Forgot password?
        </Link>
        <Link className="text-teal-700 dark:text-teal-300" to="/auth/register">
          Register business
        </Link>
      </div>
      <Link className="mt-4 inline-block text-sm text-teal-700 dark:text-teal-300" to="/auth/customer-register">
        Customer registration
      </Link>
      <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Demo access</p>
        <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">Explore the dashboard with sample sales, bookings, POS, membership, loyalty, and reports.</p>
        <div className="mt-3 grid gap-2">
          {(Object.keys(demoCredentials) as DemoBusinessKey[]).map((key) => (
            <Button key={key} variant="outline" className="w-full justify-start bg-white dark:bg-slate-900" onClick={() => void handleDemoLogin(key)} disabled={loading}>
              Open {demoCredentials[key].label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
