// Common utility types for better type safety

// Form data extraction types
export type FormDataValue = string | File | null
export type FormDataEntry = FormDataValue | FormDataValue[]

// Type guards for form data
export function isString(value: FormDataValue): value is string {
  return typeof value === 'string'
}

export function isFile(value: FormDataValue): value is File {
  return value instanceof File
}

// Validation error types
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errors?: ValidationError[]
}

// Pagination types
export interface PaginationParams {
  page: number
  limit: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Date utility types
export type DateString = string // ISO date string
export type Timestamp = string // ISO timestamp string

// ID types for better type safety
export type PollId = string
export type UserId = string
export type OptionId = string
export type VoteId = string
export type ShareToken = string

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Form state types
export interface FormState {
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  errors: Record<string, string>
}

// Error handling types
export interface ErrorInfo {
  message: string
  code?: string
  statusCode?: number
  timestamp: string
  path?: string
}

// Theme and UI types
export type ThemeMode = 'light' | 'dark' | 'system'
export type ComponentSize = 'sm' | 'md' | 'lg'
export type ComponentVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'

// Utility types for better inference
export type NonEmptyArray<T> = [T, ...T[]]
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Database operation types
export type DatabaseOperation = 'create' | 'read' | 'update' | 'delete'
export type SortOrder = 'asc' | 'desc'

export interface SortParams {
  field: string
  order: SortOrder
}

export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined
}

// Event handler types
export type EventHandler<T = Event> = (event: T) => void
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>

// Generic callback types
export type Callback<T = void> = () => T
export type AsyncCallback<T = void> = () => Promise<T>
export type CallbackWithParam<P, T = void> = (param: P) => T
export type AsyncCallbackWithParam<P, T = void> = (param: P) => Promise<T>