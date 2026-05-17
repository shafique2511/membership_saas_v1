import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

/** Creates a mock Supabase query builder that supports fluent chaining */
export function mockQueryBuilder(returnValue: unknown = []) {
  const builder: any = vi.fn(() => builder)
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.neq = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.lte = vi.fn(() => builder)
  builder.lt = vi.fn(() => builder)
  builder.gt = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.single = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => builder)
  builder.insert = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.upsert = vi.fn(() => builder)
  builder.delete = vi.fn(() => builder)
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: returnValue, error: null })
  builder.catch = vi.fn()
  builder.finally = vi.fn()
  return builder
}
