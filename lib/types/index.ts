// Central type exports for the polling application

// Re-export common types
export * from './common'
export * from './poll'

// Re-export database types
export type { Poll, PollOption, Vote, PollInsert, PollOptionInsert, VoteInsert, PollUpdate, PollOptionUpdate, VoteUpdate } from '../database/types'

/**
 * Type guard that checks whether a value is a poll object containing an options array.
 *
 * Returns true when `poll` is a non-null object with a `poll_options` property that is an array.
 * When true, narrows the type to `PollWithOptions`.
 *
 * @param poll - Value to test for the `PollWithOptions` shape
 * @returns `true` if `poll` has a `poll_options` array; otherwise `false`
 */
export function isPollWithOptions(poll: any): poll is import('./poll').PollWithOptions {
  return poll && typeof poll === 'object' && Array.isArray(poll.poll_options)
}

/**
 * Type guard that returns true when `poll` has options with numeric vote counts and a numeric total_votes.
 *
 * Checks that `poll` is a non-null object, has a `poll_options` array where every option contains a numeric
 * `vote_count`, and that `total_votes` is a number. When true, narrows the value to `PollWithResults`.
 *
 * @param poll - Value to validate as a PollWithResults-compatible object
 * @returns `true` if `poll` matches the PollWithResults shape; otherwise `false`
 */
export function isPollWithResults(poll: any): poll is import('./poll').PollWithResults {
  return poll && typeof poll === 'object' && 
    Array.isArray(poll.poll_options) &&
    poll.poll_options.every((option: any) => typeof option.vote_count === 'number') &&
    typeof poll.total_votes === 'number'
}

/**
 * Type guard that checks whether a value is a non-empty string suitable for use as a poll ID.
 *
 * @param id - Value to test.
 * @returns True if `id` is a string with length > 0 (narrows type to `string`).
 */
export function isValidPollId(id: any): id is string {
  return typeof id === 'string' && id.length > 0
}

/**
 * Type guard that checks whether a value is a non-empty share token string.
 *
 * Validates that `token` is a string with length > 0; narrows the type to `string` on success.
 *
 * @param token - Value to validate as a share token
 * @returns `true` if `token` is a non-empty string, otherwise `false`
 */
export function isValidShareToken(token: any): token is string {
  return typeof token === 'string' && token.length > 0
}

/**
 * Asserts that the given value is a PollWithOptions and narrows its type.
 *
 * Throws an Error when `poll` is not a non-null object containing a `poll_options` array.
 *
 * @param poll - Value to validate and narrow to `PollWithOptions`.
 * @throws Error when `poll` does not satisfy `PollWithOptions`
 */
export function assertPollWithOptions(poll: any): asserts poll is import('./poll').PollWithOptions {
  if (!isPollWithOptions(poll)) {
    throw new Error('Invalid poll data: missing poll_options array')
  }
}

/**
 * Asserts that a value is a PollWithResults (has poll_options with numeric `vote_count` on each option and a numeric `total_votes`).
 *
 * On success this narrows the type of `poll` to PollWithResults; on failure it throws an Error.
 *
 * @param poll - Value to validate and narrow to `PollWithResults`
 * @throws Error if `poll` is not a valid PollWithResults
 */
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