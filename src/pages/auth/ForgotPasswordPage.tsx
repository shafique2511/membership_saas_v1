import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { sendPasswordReset } from '@/services/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: resetError } = await sendPasswordReset(email)

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setMessage('Recovery link sent. Check your email.')
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-slate-500">Send a secure recovery link to your email.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="Email address" description="Enter the account email that should receive the password reset link.">
          <Input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send recovery link'}
        </Button>
      </form>
      <Link className="mt-4 inline-block text-sm text-teal-700 dark:text-teal-300" to="/auth/login">
        Back to sign in
      </Link>
    </div>
  )
}
