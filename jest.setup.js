// Mock Supabase client - simplified version
// Individual test files will override these mocks as needed

// Mock Next.js functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn()
}))

// Global test setup
global.FormData = class FormData {
  constructor() {
    this.data = new Map()
  }
  
  append(key, value) {
    if (this.data.has(key)) {
      const existing = this.data.get(key)
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        this.data.set(key, [existing, value])
      }
    } else {
      this.data.set(key, value)
    }
  }
  
  get(key) {
    const value = this.data.get(key)
    return Array.isArray(value) ? value[0] : value
  }
  
  getAll(key) {
    const value = this.data.get(key)
    return Array.isArray(value) ? value : value ? [value] : []
  }
}