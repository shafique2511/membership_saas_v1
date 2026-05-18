import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { acceptStaffInvitation } from '@/services/auth'

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await acceptStaffInvitation({ token, password, phone })
      navigate('/business')
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unable to accept invitation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Accept staff invite</h1>
      <p className="mt-2 text-sm text-slate-500">Set your password to join the business workspace.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Phone number" description="Optional contact number shown on your staff profile.">
          <Input placeholder="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Password" description="Minimum 8 characters. Use this password to sign in as staff.">
          <Input required minLength={8} type="password" placeholder="Create password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading || !token}>
          {loading ? 'Joining...' : 'Accept invitation'}
        </Button>
      </form>
      {!token ? <p className="mt-3 text-sm text-amber-700">Invitation token is missing.</p> : null}
      <Link className="mt-4 inline-block text-sm text-teal-700 dark:text-teal-300" to="/auth/login">
        Back to sign in
      </Link>
    </div>
  )
}
