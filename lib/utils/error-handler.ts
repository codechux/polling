import { toast } from 'sonner'

// Standard error types for the application
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

// Application error class with standardized structure
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly userMessage: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    userMessage?: string,
    isOperational: boolean = true
  ) {
    super(message)
    this.type = type
    this.statusCode = statusCode
    this.userMessage = userMessage || this.getDefaultUserMessage(type)
    this.isOperational = isOperational
    this.name = 'AppError'

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError)
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'Please sign in to continue'
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action'
      case ErrorType.VALIDATION:
        return 'Please check your input and try again'
      case ErrorType.NETWORK:
        return 'Network error. Please check your connection and try again'
      case ErrorType.DATABASE:
        return 'A database error occurred. Please try again later'
      case ErrorType.NOT_FOUND:
        return 'The requested resource was not found'
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again'
      default:
        return 'An unexpected error occurred. Please try again'
    }
  }
}

/**
 * Normalize an arbitrary thrown value into an AppError with a standardized type and status code.
 *
 * Accepts Error instances, strings, or any unknown value and maps common message patterns to
 * ErrorType categories (e.g., authentication, authorization, validation, network, rate limit,
 * not found, database). If the input is already an AppError it is returned unchanged.
 *
 * @param error - The thrown value to classify (Error, string, or any unknown value)
 * @returns An AppError whose `type`, `statusCode`, and `userMessage` reflect the classified category
 */
export function classifyError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Authentication errors
    if (message.includes('authentication required') || 
        message.includes('invalid login credentials') ||
        message.includes('jwt') ||
        message.includes('unauthorized')) {
      return new AppError(error.message, ErrorType.AUTHENTICATION, 401)
    }

    // Authorization errors
    if (message.includes('permission denied') ||
        message.includes('forbidden') ||
        message.includes('access denied')) {
      return new AppError(error.message, ErrorType.AUTHORIZATION, 403)
    }

    // Validation errors
    if (message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('required') ||
        message.includes('must be')) {
      return new AppError(error.message, ErrorType.VALIDATION, 400)
    }

    // Network errors
    if (message.includes('network') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('fetch')) {
      return new AppError(error.message, ErrorType.NETWORK, 503)
    }

    // Rate limiting
    if (message.includes('too many requests') ||
        message.includes('rate limit')) {
      return new AppError(error.message, ErrorType.RATE_LIMIT, 429)
    }

    // Not found errors
    if (message.includes('not found') ||
        message.includes('does not exist')) {
      return new AppError(error.message, ErrorType.NOT_FOUND, 404)
    }

    // Database errors
    if (message.includes('database') ||
        message.includes('sql') ||
        message.includes('constraint') ||
        message.includes('duplicate')) {
      return new AppError(error.message, ErrorType.DATABASE, 500)
    }

    // Default to unknown error
    return new AppError(error.message, ErrorType.UNKNOWN, 500)
  }

  // Handle non-Error objects
  const errorMessage = typeof error === 'string' ? error : 'An unknown error occurred'
  return new AppError(errorMessage, ErrorType.UNKNOWN, 500)
}

/**
 * Normalize a caught error for client consumption, optionally show a user-facing toast, and return an AppError.
 *
 * Classifies the provided `error` into an `AppError`, logs a structured error to the console when running
 * in development, and — when `showToast` is true — displays a contextual toast notification to the user
 * (via Sonner) using the error's `userMessage`. The function always returns the resulting `AppError` and
 * does not throw.
 *
 * @param error - The error to normalize (any thrown value).
 * @param showToast - If true, display a user-facing toast notification (default: `true`).
 * @returns The normalized AppError instance representing the input error.
 */
export function handleClientError(error: unknown, showToast: boolean = true): AppError {
  const appError = classifyError(error)
  
  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('Client Error:', {
      message: appError.message,
      type: appError.type,
      statusCode: appError.statusCode,
      stack: appError.stack
    })
  }

  // Show user-friendly toast notification
  if (showToast) {
    switch (appError.type) {
      case ErrorType.AUTHENTICATION:
        toast.error('Sign in required', {
          description: appError.userMessage
        })
        break
      case ErrorType.AUTHORIZATION:
        toast.error('Access denied', {
          description: appError.userMessage
        })
        break
      case ErrorType.VALIDATION:
        toast.error('Invalid input', {
          description: appError.userMessage
        })
        break
      case ErrorType.NETWORK:
        toast.error('Connection error', {
          description: appError.userMessage
        })
        break
      case ErrorType.RATE_LIMIT:
        toast.error('Too many requests', {
          description: appError.userMessage
        })
        break
      default:
        toast.error('Error', {
          description: appError.userMessage
        })
    }
  }

  return appError
}

/**
 * Classifies an arbitrary error into an AppError, logs a structured server-side record for monitoring, and returns the resulting AppError.
 *
 * The function normalizes the provided `error` via `classifyError`, emits a consistent console.error entry containing message, type, statusCode, stack, and timestamp, and then returns the normalized AppError. It does not rethrow the error.
 *
 * @returns The normalized AppError representing the original error.
 */
export function handleServerError(error: unknown): AppError {
  const appError = classifyError(error)
  
  // Log error for monitoring
  console.error('Server Error:', {
    message: appError.message,
    type: appError.type,
    statusCode: appError.statusCode,
    stack: appError.stack,
    timestamp: new Date().toISOString()
  })

  return appError
}

/**
 * Wraps an async function so any thrown error is classified and rethrown as an AppError.
 *
 * Returns a new async function with the same signature as `fn`. If `fn` rejects, the error
 * is passed to `handleServerError` and the resulting `AppError` is thrown.
 *
 * @param fn - The asynchronous function to wrap.
 * @returns A function that calls `fn` and converts any thrown error into an `AppError`.
 * @throws AppError when the wrapped function throws; the original error is classified via `handleServerError`.
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const appError = handleServerError(error)
      throw appError
    }
  }
}

/**
 * Convert a thrown Error into an error-boundary-friendly fallback payload.
 *
 * Returns title, user-facing message, whether retry is allowed, and a retry action
 * derived from the classified AppError. Authorization errors disable retry.
 *
 * @param error - The original Error caught by the React error boundary
 * @param resetError - Callback to reset the error boundary (executed when retry is chosen)
 * @returns An object with:
 *   - title: short UI title for the error
 *   - message: user-facing message suitable for display
 *   - canRetry: false when the error is an authorization error, true otherwise
 *   - onRetry: function to invoke to attempt recovery (calls `resetError`)
 */
export function getErrorBoundaryFallback(error: Error, resetError: () => void) {
  const appError = classifyError(error)
  
  return {
    title: getErrorTitle(appError.type),
    message: appError.userMessage,
    canRetry: appError.type !== ErrorType.AUTHORIZATION,
    onRetry: resetError
  }
}

/**
 * Returns a short, user-facing title for an ErrorType used in UI error displays.
 *
 * @param type - The error category to convert into a display title.
 * @returns A concise title suitable for dialogs, toasts, or error boundaries.
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.AUTHENTICATION:
      return 'Authentication Required'
    case ErrorType.AUTHORIZATION:
      return 'Access Denied'
    case ErrorType.VALIDATION:
      return 'Invalid Input'
    case ErrorType.NETWORK:
      return 'Connection Error'
    case ErrorType.NOT_FOUND:
      return 'Not Found'
    case ErrorType.RATE_LIMIT:
      return 'Too Many Requests'
    default:
      return 'Something Went Wrong'
  }
}