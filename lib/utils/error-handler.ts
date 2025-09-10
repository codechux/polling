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

// Error classification helper
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

// Client-side error handler with toast notifications
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

// Server-side error handler
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

// Async error wrapper for server actions
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

// Error boundary helper for React components
export function getErrorBoundaryFallback(error: Error, resetError: () => void) {
  const appError = classifyError(error)
  
  return {
    title: getErrorTitle(appError.type),
    message: appError.userMessage,
    canRetry: appError.type !== ErrorType.AUTHORIZATION,
    onRetry: resetError
  }
}

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