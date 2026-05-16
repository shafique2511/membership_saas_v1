import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-500">Access your business workspace.</p>
      <form className="mt-6 space-y-4">
        <Input type="email" placeholder="Email address" />
        <Input type="password" placeholder="Password" />
        <Button className="w-full">Sign in</Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link className="text-teal-700 dark:text-teal-300" to="/auth/forgot-password">
          Forgot password?
        </Link>
        <Link className="text-teal-700 dark:text-teal-300" to="/auth/register">
          Register
        </Link>
      </div>
    </div>
  )
}
