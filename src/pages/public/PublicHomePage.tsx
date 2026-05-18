import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function PublicHomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Luxantara Members</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Membership, booking, POS, and customer portal management.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Sign in to manage businesses, bookings, memberships, payments, and customer activity.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/auth/login"><Button>Sign in</Button></Link>
          <Link to="/auth/register"><Button variant="outline">Register</Button></Link>
        </div>
      </div>
    </div>
  )
}
