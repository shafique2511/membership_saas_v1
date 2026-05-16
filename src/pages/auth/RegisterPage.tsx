import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registerBusinessOwner } from '@/services/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('barber_shop')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await registerBusinessOwner({ businessName, businessType, ownerName, email, password })
      navigate('/business')
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
        <Input required placeholder="Business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
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
        <Input required placeholder="Owner full name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
        <Input required type="email" placeholder="Owner email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input required minLength={8} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
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
