import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { AppContext, type AppContextValue } from '@/context/AppContextCore'
import { supabase } from '@/lib/supabase'
import { modulePermissionMap, roleHasPermission } from '@/services/permissions'
import { signOut } from '@/services/auth'
import type { ModuleKey, Permission, UserProfile } from '@/types'

const defaultModules: ModuleKey[] = ['core', 'booking', 'customer_portal', 'reports']

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([])
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, boolean>>({})
  const [customPermissionRoleActive, setCustomPermissionRoleActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  async function loadAuthState(nextUser?: User | null) {
    setLoading(true)

    const resolvedUser = nextUser ?? (await supabase.auth.getUser()).data.user
    setUser(resolvedUser)

    if (!resolvedUser) {
      setProfile(null)
      setEnabledModules([])
      setPermissionOverrides({})
      setCustomPermissionRoleActive(false)
      setLoading(false)
      return
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', resolvedUser.id)
      .maybeSingle()

    const nextProfile = profileData as UserProfile | null
    setProfile(nextProfile)

    if (!nextProfile?.business_id) {
      setEnabledModules(nextProfile?.role === 'super_admin' ? defaultModules : [])
      setPermissionOverrides({})
      setCustomPermissionRoleActive(false)
      setLoading(false)
      return
    }

    const { data: moduleData } = await supabase
      .from('business_module_access')
      .select('module_key')
      .eq('business_id', nextProfile.business_id)
      .eq('is_enabled', true)
      .neq('access_level', 'none')
      .lte('start_date', new Date().toISOString().slice(0, 10))
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString().slice(0, 10)}`)

    const modules = (moduleData ?? []).map((item) => item.module_key as ModuleKey)
    setEnabledModules(modules.length ? modules : defaultModules)

    const { data: staffData } = await supabase
      .from('staff')
      .select('id,permission_role_key')
      .eq('business_id', nextProfile.business_id)
      .eq('user_id', resolvedUser.id)
      .eq('status', 'active')
      .maybeSingle()

    const permissionRoleKey = typeof staffData?.permission_role_key === 'string' ? staffData.permission_role_key : nextProfile.role
    setCustomPermissionRoleActive(permissionRoleKey !== nextProfile.role)

    const { data: rolePermissionData } = await supabase
      .from('staff_permissions')
      .select('permission_key,is_granted')
      .eq('business_id', nextProfile.business_id)
      .eq('role', permissionRoleKey)

    const nextOverrides: Record<string, boolean> = {}
    for (const item of rolePermissionData ?? []) {
      nextOverrides[String(item.permission_key)] = Boolean(item.is_granted)
    }

    if (staffData?.id) {
      const { data: staffPermissionData } = await supabase
        .from('staff_user_permissions')
        .select('permission_key,is_granted')
        .eq('business_id', nextProfile.business_id)
        .eq('staff_id', staffData.id)

      for (const item of staffPermissionData ?? []) {
        nextOverrides[String(item.permission_key)] = Boolean(item.is_granted)
      }
    }

    setPermissionOverrides(nextOverrides)
    setLoading(false)
  }

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      void loadAuthState()
    }, 0)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAuthState(session?.user ?? null)
    })

    return () => {
      window.clearTimeout(loadTask)
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      profile,
      enabledModules,
      role: profile?.role ?? null,
      loading,
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
      canAccessModule: (module) => {
        if (!enabledModules.includes(module)) return false
        if (profile?.role === 'super_admin' || profile?.role === 'owner') return true
        const permission = modulePermissionMap[module]
        if (!permission) return true
        if (typeof permissionOverrides[permission] === 'boolean') return permissionOverrides[permission]
        if (customPermissionRoleActive) return false
        return roleHasPermission(profile?.role, permission)
      },
      hasRole: (role) => {
        if (!profile) {
          return false
        }

        return Array.isArray(role) ? role.includes(profile.role) : profile.role === role
      },
      hasPermission: (permission: Permission) => {
        if (typeof permissionOverrides[permission] === 'boolean') return permissionOverrides[permission]
        if (customPermissionRoleActive) return false
        return roleHasPermission(profile?.role, permission)
      },
      refreshAuth: () => loadAuthState(),
      logout: async () => {
        await signOut()
        setUser(null)
        setProfile(null)
        setEnabledModules([])
        setPermissionOverrides({})
        setCustomPermissionRoleActive(false)
      },
    }),
    [customPermissionRoleActive, darkMode, enabledModules, loading, permissionOverrides, profile, sidebarOpen, user],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
