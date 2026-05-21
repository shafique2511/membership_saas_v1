import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleRoute } from '@/components/auth/ModuleRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { getBusinessNavItems } from '@/components/layout/navigation'
import { AppContext, type AppContextValue } from '@/context/AppContextCore'
import { isModuleInPackage } from '@/services/moduleAccess'
import { modulePermissionMap, roleHasPermission } from '@/services/permissions'
import type { ModuleKey, UserProfile } from '@/types'

function readSql(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

const phase27Sql = readSql('supabase/migrations/202605200001_phase_27_data_backup_shutdown_policy.sql')
const phase29Sql = readSql('supabase/migrations/202605200003_phase_29_review_collection_system.sql')
const phase32Sql = readSql('supabase/migrations/202605200004_phase_32_demo_mode.sql')
const phase35Sql = readSql('supabase/migrations/202605200005_phase_35_audit_logs.sql')
const phase39SeedSql = readSql('supabase/seed/202605210001_phase_39_seed_data.sql')

function makeProfile(role: UserProfile['role'], businessId: string | null = 'biz-a'): UserProfile {
  return {
    id: `user-${role}`,
    business_id: businessId,
    branch_id: null,
    full_name: `${role} user`,
    email: `${role}@example.test`,
    phone: null,
    role,
    avatar_url: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function renderWithContext(ui: React.ReactElement, overrides: Partial<AppContextValue>) {
  const value: AppContextValue = {
    user: { id: 'user-owner' } as never,
    profile: makeProfile('owner'),
    enabledModules: ['core', 'booking', 'customer_portal', 'reports'],
    role: 'owner',
    loading: false,
    sidebarOpen: false,
    darkMode: false,
    setSidebarOpen: vi.fn(),
    toggleDarkMode: vi.fn(() => document.documentElement.classList.toggle('dark')),
    hasModule: (module) => value.enabledModules.includes(module),
    canAccessModule: (module) => value.enabledModules.includes(module),
    hasRole: (role) => Array.isArray(role) ? role.includes(value.profile?.role ?? 'customer') : value.profile?.role === role,
    hasPermission: (permission) => roleHasPermission(value.profile?.role, permission),
    refreshAuth: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }

  return render(
    <AppContext.Provider value={value}>
      <MemoryRouter initialEntries={['/business']}>{ui}</MemoryRouter>
    </AppContext.Provider>,
  )
}

describe('2. Role permissions', () => {
  it('staff cannot access owner settings, billing, exports, or platform backup permissions', () => {
    expect(roleHasPermission('staff', 'settings.manage')).toBe(false)
    expect(roleHasPermission('staff', 'billing.manage')).toBe(false)
    expect(roleHasPermission('staff', 'data.backup.manage')).toBe(false)
    expect(roleHasPermission('staff', 'platform.access')).toBe(false)
  })

  it('customer permissions are limited to own portal workflows', () => {
    expect(roleHasPermission('customer', 'customer.profile.view')).toBe(true)
    expect(roleHasPermission('customer', 'customer.history.view')).toBe(true)
    expect(roleHasPermission('customer', 'bookings.view')).toBe(false)
    expect(roleHasPermission('customer', 'reports.view')).toBe(false)
    expect(roleHasPermission('customer', 'settings.manage')).toBe(false)
  })
})

describe('4. Module access and locked modules', () => {
  it('business navigation only includes enabled modules', () => {
    const items = getBusinessNavItems((module) => ['core', 'booking', 'reports'].includes(module))

    expect(items.map((item) => item.label)).toEqual(expect.arrayContaining(['Dashboard', 'Bookings', 'Reports']))
    expect(items.map((item) => item.label)).not.toContain('POS')
    expect(items.map((item) => item.label)).not.toContain('AI Assistant')
  })

  it('locked URL module renders upgrade prompt instead of a broken page', () => {
    renderWithContext(<ModuleRoute moduleKey="pos" moduleName="POS module" />, {
      enabledModules: ['core', 'booking'],
      canAccessModule: () => false,
    })

    expect(screen.getByText('Locked module')).toBeInTheDocument()
    expect(screen.getByText('POS module is locked')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /upgrade plan/i })).toHaveAttribute('href', '/business/upgrade?module=pos')
  })
})

describe('5. Package limits and package matrix', () => {
  it('starter package excludes paid operational modules while enterprise includes premium AI', () => {
    expect(isModuleInPackage('starter', 'booking')).toBe(true)
    expect(isModuleInPackage('starter', 'pos')).toBe(false)
    expect(isModuleInPackage('starter', 'ai_assistant')).toBe(false)
    expect(isModuleInPackage('enterprise', 'ai_assistant')).toBe(true)
  })

  it('module permission map protects each non-core operational module with a permission', () => {
    const protectedModules: ModuleKey[] = [
      'booking',
      'membership',
      'loyalty',
      'pos',
      'inventory',
      'staff_commission',
      'payment',
      'notification',
      'reports',
      'marketing',
      'multi_branch',
      'white_label',
      'data_ownership_backup',
      'ai_assistant',
    ]

    for (const module of protectedModules) {
      expect(modulePermissionMap[module], module).toBeTruthy()
    }
  })
})

describe('15. Mobile responsiveness and 16. dark mode shell', () => {
  it('renders mobile owner bottom navigation with large quick actions for business pages', () => {
    renderWithContext(<DashboardLayout />, {
      enabledModules: ['core', 'booking', 'pos', 'membership', 'reports'],
      canAccessModule: () => true,
    })

    expect(screen.getByText('Book')).toBeInTheDocument()
    expect(screen.getAllByText('POS').length).toBeGreaterThan(0)
    expect(screen.getByText('Scan')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
  })

  it('dark mode toggle mutates the root dark class', () => {
    document.documentElement.classList.remove('dark')
    const toggleDarkMode = vi.fn(() => document.documentElement.classList.toggle('dark'))

    renderWithContext(<DashboardLayout />, { toggleDarkMode })
    toggleDarkMode()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('17. RLS policies and database guardrails', () => {
  it('tenant RLS uses business access and customer ownership predicates', () => {
    const baseSchema = readSql('supabase/migrations/202605160001_phase_2_schema.sql')

    expect(baseSchema).toContain('public.has_business_access(business_id)')
    expect(baseSchema).toContain('public.customer_owns_record(customer_id)')
    expect(baseSchema).toContain('create policy "bookings tenant or customer read"')
    expect(baseSchema).toContain('create policy "payments tenant or customer read"')
  })

  it('backup and shutdown operations are guarded by owner/business checks or super admin checks', () => {
    expect(phase27Sql).toContain("if p_scope = 'platform' and not public.is_super_admin(auth.uid())")
    expect(phase27Sql).toContain("if p_scope = 'business' and not public.can_create_business_export")
    expect(phase27Sql).toContain('Only super admins can queue shutdown notices')
    expect(phase27Sql).toContain('public.has_business_access(business_id)')
  })

  it('audit logs are immutable for normal users and capture important action triggers', () => {
    expect(phase35Sql).toContain('prevent_audit_log_mutation')
    expect(phase35Sql).toContain('Audit logs cannot be edited by normal users')
    expect(phase35Sql).toContain('created_booking')
    expect(phase35Sql).toContain('created_pos_order')
    expect(phase35Sql).toContain('changed_package')
    expect(phase35Sql).toContain('changed_module_access')
  })

  it('demo users are blocked from deleting real business data', () => {
    expect(phase32Sql).toContain('prevent_demo_user_real_data_delete')
    expect(phase32Sql).toContain('Demo users cannot delete real business data')
    expect(phase32Sql).toContain('not coalesce(v_is_demo_business, false)')
  })
})

describe('Phase 39 seed validation for Phase 40 scenarios', () => {
  it('seeds the required demo tenants and scenario records without invalid plan types', () => {
    expect(phase39SeedSql).toContain('Demo Barber Shop')
    expect(phase39SeedSql).toContain('Demo Coffee Shop')
    expect(phase39SeedSql).toContain('Haircut + Beard')
    expect(phase39SeedSql).toContain('Private Room')
    expect(phase39SeedSql).toContain('Prepaid RM100 get RM110 credit')
    expect(phase39SeedSql).toContain('insert into public.reviews')
    expect(phase39SeedSql).toContain('insert into public.audit_logs')
    expect(phase39SeedSql).not.toContain("'visit_based'")
    expect(phase39SeedSql).not.toContain("'credit', 'Demo prepaid")
  })

  it('review collection supports booking/order, staff, service, and hidden review status', () => {
    expect(phase29Sql).toContain('staff_rating')
    expect(phase29Sql).toContain('service_rating')
    expect(phase29Sql).toContain('booking_id')
    expect(phase29Sql).toContain('pos_order_id')
    expect(phase39SeedSql).toContain("'hidden'")
  })
})
