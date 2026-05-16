import { createContext } from 'react'
import type { ModuleKey, UserRole } from '@/types'

export interface AppContextValue {
  enabledModules: ModuleKey[]
  role: UserRole
  sidebarOpen: boolean
  darkMode: boolean
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  hasModule: (module: ModuleKey) => boolean
}

export const AppContext = createContext<AppContextValue | null>(null)
