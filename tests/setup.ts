import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock CloudBase SDK
vi.mock('@/config/tcb', () => ({
  default: {
    database: vi.fn(() => ({
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({ data: [] }))
          })),
          get: vi.fn(() => Promise.resolve({ data: [] }))
        })),
        add: vi.fn(() => Promise.resolve({ id: 'test-id' })),
        doc: vi.fn(() => ({
          update: vi.fn(() => Promise.resolve({ updated: 1 })),
          remove: vi.fn(() => Promise.resolve({ deleted: 1 })),
          get: vi.fn(() => Promise.resolve({ data: {} }))
        }))
      }))
    })),
    callFunction: vi.fn(() => Promise.resolve({ result: { code: 0, data: [] } })),
    auth: vi.fn(() => ({
      getLoginState: vi.fn(() => Promise.resolve(true))
    }))
  }
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
