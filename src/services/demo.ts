import { signInWithEmail } from '@/services/auth'

export type DemoBusinessKey = 'barber' | 'coffee'

export const demoCredentials: Record<DemoBusinessKey, { label: string; email: string; password: string }> = {
  barber: {
    label: 'Demo Barber Shop',
    email: 'barber_owner@demo.com',
    password: 'Demo@123456',
  },
  coffee: {
    label: 'Demo Coffee Shop',
    email: 'coffee_owner@demo.com',
    password: 'Demo@123456',
  },
}

export async function signInDemoBusiness(key: DemoBusinessKey) {
  const credentials = demoCredentials[key]
  return signInWithEmail(credentials.email, credentials.password)
}
