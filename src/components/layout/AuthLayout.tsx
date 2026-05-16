import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_1.1fr] dark:bg-slate-950">
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Luxantara Members</p>
              <p className="text-xs text-slate-500">Secure business access</p>
            </div>
          </div>
          <Outlet />
        </div>
      </section>
      <section className="hidden bg-[linear-gradient(135deg,#0f766e,#d97706)] p-10 text-white lg:flex lg:flex-col lg:justify-end">
        <p className="max-w-lg text-3xl font-semibold">
          Memberships, bookings, loyalty, and checkout in one modular platform.
        </p>
      </section>
    </div>
  )
}
