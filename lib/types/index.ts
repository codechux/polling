// Central type exports for the polling application

// Re-export common types
export * from './common'
export * from './poll'

// Re-export database types
export type { Poll, PollOption, Vote, PollInsert, PollOptionInsert, VoteInsert, PollUpdate, PollOptionUpdate, VoteUpdate } from '../database/types'

// Type guards and utilities
export function isPollWithOptions(poll: any): poll is import('./poll').PollWithOptions {
  return poll && typeof poll === 'object' && Array.isArray(poll.poll_options)
}

export function isPollWithResults(poll: any): poll is import('./poll').PollWithResults {
  return poll && typeof poll === 'object' && 
    Array.isArray(poll.poll_options) &&
    poll.poll_options.every((option: any) => typeof option.vote_count === 'number') &&
    typeof poll.total_votes === 'number'
}

export function isValidPollId(id: any): id is string {
  return typeof id === 'string' && id.length > 0
}

export function isValidShareToken(token: any): token is string {
  return typeof token === 'string' && token.length > 0
}

// Type assertion helpers (safer alternatives to 'as')
export function assertPollWithOptions(poll: any): asserts poll is import('./poll').PollWithOptions {
  if (!isPollWithOptions(poll)) {
    throw new Error('Invalid poll data: missing poll_options array')
  }
}

export function assertPollWithResults(poll: any): asserts poll is import('./poll').PollWithResults {
  if (!isPollWithResults(poll)) {
    throw new Error('Invalid poll data: missing vote counts or total_votes')
  }
}

// Utility types for component props
export type WithClassName<T = {}> = T & { className?: string }
export type WithChildren<T = {}> = T & { children?: React.ReactNode }
export type WithOptionalChildren<T = {}> = T & { children?: React.ReactNode }

// Form handling types
export interface FormFieldError {
  message: string
  type?: 'required' | 'pattern' | 'min' | 'max' | 'custom'
}

export type FormErrors<T> = Partial<Record<keyof T, FormFieldError>>

// API types
export interface SuccessResponse<T = any> {
  success: true
  data: T
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
}

export type ApiResult<T = any> = SuccessResponse<T> | ErrorResponse

// Environment types
export interface EnvironmentConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  NODE_ENV: 'development' | 'production' | 'test'
}

// Declare global environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentConfig {}
  }
}