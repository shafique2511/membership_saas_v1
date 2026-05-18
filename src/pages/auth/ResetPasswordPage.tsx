import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/services/auth'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error: updateError } = await updatePassword(password)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setMessage('Password updated. Redirecting to sign in.')
    setLoading(false)
    window.setTimeout(() => navigate('/auth/login'), 800)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Set new password</h1>
      <p className="mt-2 text-sm text-slate-500">Choose a new password for your account.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Field label="New password" description="Minimum 8 characters. This replaces your current account password.">
          <Input
            required
            minLength={8}
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update password'}
        </Button>
      </form>
      <Link className="mt-4 inline-block text-sm text-teal-700 dark:text-teal-300" to="/auth/login">
        Back to sign in
      </Link>
    </div>
  )
}
