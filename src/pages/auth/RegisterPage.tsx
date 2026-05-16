import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Create workspace</h1>
      <p className="mt-2 text-sm text-slate-500">Start a modular membership and booking business.</p>
      <form className="mt-6 space-y-4">
        <Input placeholder="Business name" />
        <Input type="email" placeholder="Owner email" />
        <Input type="password" placeholder="Password" />
        <Button className="w-full">Create account</Button>
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
