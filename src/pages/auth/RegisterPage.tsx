import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { registerBusinessOwner } from '@/services/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('barber_shop')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (!acceptedLegal) {
      setError('You must agree to the Terms of Service and Privacy Policy to create a workspace.')
      setLoading(false)
      return
    }

    try {
      await registerBusinessOwner({ businessName, businessType, ownerName, email, password })
      navigate('/app/setup')
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to create workspace.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create workspace</h1>
      <p className="mt-2 text-sm text-slate-500">Start a modular membership and booking business.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Business name" description="The public name shown in dashboards, receipts, and customer pages.">
          <Input required placeholder="Example: Luxantara Barber" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        </Field>
        <Field label="Business type" description="Used to tune labels and starter workflows for this business.">
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
          >
            <option value="barber_shop">Barber shop</option>
            <option value="coffee_shop">Coffee shop</option>
            <option value="salon">Salon</option>
            <option value="spa">Spa</option>
            <option value="clinic">Clinic</option>
            <option value="event_space">Event space</option>
            <option value="custom">Custom service business</option>
          </select>
        </Field>
        <Field label="Owner full name" description="Main account holder who can manage settings, modules, staff, and billing.">
          <Input required placeholder="Owner full name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
        </Field>
        <Field label="Owner email" description="Login email for the business owner account.">
          <Input required type="email" placeholder="owner@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" description="Minimum 8 characters. Use a secure password for the owner account.">
          <Input required minLength={8} type="password" placeholder="Create password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
          <input
            className="mt-1"
            required
            type="checkbox"
            checked={acceptedLegal}
            onChange={(event) => setAcceptedLegal(event.target.checked)}
          />
          <span>
            I agree to the{' '}
            <Link className="text-teal-700 dark:text-teal-300" to="/terms" target="_blank">Terms of Service</Link>
            {' '}and{' '}
            <Link className="text-teal-700 dark:text-teal-300" to="/privacy" target="_blank">Privacy Policy</Link>.
          </span>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{' '}
        <Link className="text-teal-700 dark:text-teal-300" to="/auth/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
