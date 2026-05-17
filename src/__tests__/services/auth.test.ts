import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockAuth } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  }
  return { mockFrom, mockAuth }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mockAuth,
    from: mockFrom,
    rpc: vi.fn(),
  },
}))

import {
  signInWithEmail,
  signOut,
  sendPasswordReset,
  updatePassword,
  registerBusinessOwner,
  registerCustomer,
  hasRole,
  hasModuleAccess,
  requireAuth,
  requireRole,
  requireModule,
  AuthRequiredError,
  RoleRequiredError,
  ModuleRequiredError,
} from '@/services/auth'

function mockBuilder(data: unknown) {
  const result = { data, error: null }
  const b: any = vi.fn(() => b)
  b.select = vi.fn(() => b)
  b.eq = vi.fn(() => b)
  b.neq = vi.fn(() => b)
  b.gte = vi.fn(() => b)
  b.lte = vi.fn(() => b)
  b.or = vi.fn(() => b)
  b.single = vi.fn(() => b)
  b.maybeSingle = vi.fn(() => b)
  b.then = (resolve: (v: unknown) => void) => resolve(result)
  return b
}

describe('1. Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signInWithEmail calls supabase auth signInWithPassword', async () => {
    const mockRes = { data: { user: { id: 'u1' } }, error: null }
    mockAuth.signInWithPassword.mockResolvedValue(mockRes)

    const result = await signInWithEmail('test@test.com', 'password123')
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    })
    expect(result).toEqual(mockRes)
  })

  it('signOut calls supabase auth signOut', async () => {
    const mockRes = { error: null }
    mockAuth.signOut.mockResolvedValue(mockRes)

    const result = await signOut()
    expect(mockAuth.signOut).toHaveBeenCalled()
    expect(result).toEqual(mockRes)
  })

  it('sendPasswordReset calls resetPasswordForEmail', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    await sendPasswordReset('test@test.com')
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com', {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  })

  it('updatePassword calls updateUser', async () => {
    mockAuth.updateUser.mockResolvedValue({ data: {}, error: null })

    await updatePassword('newpass123')
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('registerBusinessOwner sets role=owner in metadata', async () => {
    const input = {
      businessName: 'Test Biz',
      businessType: 'barber_shop',
      ownerName: 'Owner Name',
      email: 'owner@test.com',
      password: 'pass123',
    }
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    await registerBusinessOwner(input)
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'owner@test.com',
      password: 'pass123',
      options: {
        data: {
          full_name: 'Owner Name',
          role: 'owner',
          business_name: 'Test Biz',
          business_type: 'barber_shop',
        },
      },
    })
  })

  it('registerCustomer sets role=customer in metadata', async () => {
    const input = {
      businessId: 'b1',
      fullName: 'John Doe',
      email: 'john@test.com',
      phone: '0123456789',
      password: 'pass123',
    }
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    await registerCustomer(input)
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'john@test.com',
      password: 'pass123',
      options: {
        data: {
          full_name: 'John Doe',
          role: 'customer',
          business_id: 'b1',
          phone: '0123456789',
        },
      },
    })
  })
})

describe('2. Role permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } }, error: null })
  })

  it('hasRole checks profile role from supabase', async () => {
    mockFrom.mockReturnValue(mockBuilder({ role: 'owner' }))

    const result = await hasRole('owner')
    expect(result).toBe(true)
  })

  it('hasRole returns false for mismatched role', async () => {
    mockFrom.mockReturnValue(mockBuilder({ role: 'staff' }))

    const result = await hasRole('owner')
    expect(result).toBe(false)
  })

  it('hasRole accepts array of roles', async () => {
    mockFrom.mockReturnValue(mockBuilder({ role: 'manager' }))

    const result = await hasRole(['owner', 'manager'])
    expect(result).toBe(true)
  })

  it('requireAuth throws if no user', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireAuth()).rejects.toThrow(AuthRequiredError)
  })

  it('requireRole throws if insufficient role', async () => {
    mockFrom.mockReturnValue(mockBuilder({ role: 'staff' }))

    await expect(requireRole('owner')).rejects.toThrow(RoleRequiredError)
  })

  it('requireRole passes with sufficient role', async () => {
    mockFrom.mockReturnValue(mockBuilder({ role: 'owner' }))

    await expect(requireRole('owner')).resolves.not.toThrow()
  })
})

describe('3. Module access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } }, error: null })
  })

  it('hasModuleAccess checks business_module_access table', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') return mockBuilder({ role: 'owner', business_id: 'biz-1' })
      return mockBuilder([{ id: '1' }])
    })

    const result = await hasModuleAccess('booking')
    expect(result).toBe(true)
  })

  it('hasModuleAccess returns false for locked module', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') return mockBuilder({ role: 'owner', business_id: 'biz-1' })
      return mockBuilder(null)
    })

    const result = await hasModuleAccess('white_label')
    expect(result).toBe(false)
  })

  it('requireModule throws if module not available', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_profiles') return mockBuilder({ role: 'owner', business_id: 'biz-1' })
      return mockBuilder(null)
    })

    await expect(requireModule('pos')).rejects.toThrow(ModuleRequiredError)
  })

  it('hasModuleAccess returns false for locked module', async () => {
    mockFrom.mockReturnValue(mockBuilder([]))

    const result = await hasModuleAccess('white_label')
    expect(result).toBe(false)
  })

  it('requireModule throws if module not available', async () => {
    mockFrom.mockReturnValue(mockBuilder([]))

    await expect(requireModule('pos')).rejects.toThrow(ModuleRequiredError)
  })
})
