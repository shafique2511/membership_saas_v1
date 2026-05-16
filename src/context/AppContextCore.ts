import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ModuleKey, Permission, UserProfile, UserRole } from '@/types'

export interface AppContextValue {
  user: User | null
  profile: UserProfile | null
  enabledModules: ModuleKey[]
  role: UserRole | null
  loading: boolean
  sidebarOpen: boolean
  darkMode: boolean
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  hasModule: (module: ModuleKey) => boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasPermission: (permission: Permission) => boolean
  refreshAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const AppContext = createContext<AppContextValue | null>(null)
