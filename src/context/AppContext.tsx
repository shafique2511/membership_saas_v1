import { useMemo, useState, type ReactNode } from 'react'
import { AppContext, type AppContextValue } from '@/context/AppContextCore'
import type { ModuleKey, UserRole } from '@/types'

const defaultModules: ModuleKey[] = ['core', 'booking', 'customer_portal', 'reports']

export function AppProvider({ children }: { children: ReactNode }) {
  const [enabledModules] = useState<ModuleKey[]>(defaultModules)
  const [role] = useState<UserRole>('owner')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  const value = useMemo<AppContextValue>(
    () => ({
      enabledModules,
      role,
      sidebarOpen,
      darkMode,
      setSidebarOpen,
      toggleDarkMode: () => {
        setDarkMode((current) => {
          const next = !current
          document.documentElement.classList.toggle('dark', next)
          return next
        })
      },
      hasModule: (module) => enabledModules.includes(module),
    }),
    [darkMode, enabledModules, role, sidebarOpen],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
