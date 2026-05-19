import { Bell, LogOut, Menu, Moon, Sun, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAppContext } from '@/context/useAppContext'

export function Topbar() {
  const navigate = useNavigate()
  const { darkMode, logout, profile, setSidebarOpen, toggleDarkMode } = useAppContext()

  async function handleLogout() {
    await logout()
    navigate('/auth/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:h-16 sm:px-4 lg:px-6 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden h-5 w-px bg-slate-200 sm:block lg:hidden dark:bg-slate-700" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {profile?.full_name || 'Business'}
            </p>
            <p className="hidden items-center gap-1 text-[11px] text-slate-500 sm:flex">
              <Package className="h-3 w-3" />
              Starter package
            </p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Logout" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white sm:flex">
          {profile?.full_name
            ?.split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? 'LM'}
        </div>
      </div>
    </header>
  )
}
