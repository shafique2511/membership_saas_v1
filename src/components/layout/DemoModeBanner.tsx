import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppContext } from '@/context/useAppContext'

export function DemoModeBanner() {
  const { profile } = useAppContext()

  if (!profile?.is_demo_user) {
    return null
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Demo Mode</p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
            You are exploring sample business data. Demo records may reset automatically and cannot be used to manage real customer data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/contact">
            <Button size="sm" variant="outline" className="bg-white dark:bg-slate-900">
              Contact Sales <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/auth/register">
            <Button size="sm">Start Trial</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
