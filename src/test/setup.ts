import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock adminService for HTTP-based cloud function calls
vi.mock('@/services/adminService', () => ({
  adminService: {
    callFunction: vi.fn(() => Promise.resolve({ success: true, data: {} })),
    list: vi.fn(() => Promise.resolve({ data: [] })),
    add: vi.fn(() => Promise.resolve({ id: 'test-id' })),
    update: vi.fn(() => Promise.resolve({ updated: 1 })),
    delete: vi.fn(() => Promise.resolve({ deleted: 1 })),
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
