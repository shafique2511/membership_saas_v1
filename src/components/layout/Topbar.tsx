import { Bell, Menu, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppContext } from '@/context/useAppContext'

export function Topbar() {
  const { darkMode, setSidebarOpen, toggleDarkMode } = useAppContext()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm font-semibold">Demo Barber House</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Starter package</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white sm:flex">
          LB
        </div>
      </div>
    </header>
  )
}
