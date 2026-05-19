import { Outlet } from 'react-router-dom'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export function DashboardLayout() {
  return (
    <div className="flex min-h-dvh bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
