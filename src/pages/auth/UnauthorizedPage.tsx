import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export function UnauthorizedPage() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Access restricted</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your account role does not have permission to open this area.
      </p>
      <Link
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
        to="/business"
      >
        Back to workspace
      </Link>
    </div>
  )
}
