import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { registerCustomer } from '@/services/auth'

export function CustomerRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const businessId = searchParams.get('business_id') || import.meta.env.VITE_DEFAULT_CUSTOMER_BUSINESS_ID || ''
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (!businessId) {
      setError('Missing business id for customer registration.')
      setLoading(false)
      return
    }

    try {
      await registerCustomer({ businessId, fullName, email, phone, password })
      navigate('/customer')
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to register customer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Customer registration</h1>
      <p className="mt-2 text-sm text-slate-500">Create a customer portal account.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Full name" description="Name shown on bookings, memberships, loyalty records, and receipts.">
          <Input required placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <Field label="Email address" description="Used to sign in and receive account or booking updates.">
          <Input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Phone number" description="Optional contact number for reminders and business follow-up.">
          <Input placeholder="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Password" description="Minimum 8 characters for customer portal login.">
          <Input required minLength={8} type="password" placeholder="Create password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create customer account'}
        </Button>
      </form>
      <Link className="mt-4 inline-block text-sm text-teal-700 dark:text-teal-300" to="/auth/login">
        Sign in instead
      </Link>
    </div>
  )
}
