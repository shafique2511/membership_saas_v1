import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-slate-500">Send a secure recovery link to your email.</p>
      <form className="mt-6 space-y-4">
        <Input type="email" placeholder="Email address" />
        <Button className="w-full">Send recovery link</Button>
      </form>
      <Link className="mt-4 inline-block text-sm text-teal-700 dark:text-teal-300" to="/auth/login">
        Back to sign in
      </Link>
    </div>
  )
}
