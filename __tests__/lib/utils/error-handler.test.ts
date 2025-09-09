/**
 * Tests for lib/utils/error-handler.ts
 * Framework: Jest 29 + ts-jest
 *
 * Verifies:
 * - AppError shape and defaults
 * - classifyError coverage across all categories and edge cases
 * - handleClientError logging behavior by NODE_ENV and toast semantics
 * - handleServerError logging payload + timestamp and return value
 * - withErrorHandling wrapper semantics (resolve, rethrow, classification)
 * - getErrorBoundaryFallback mapping of titles/messages and retry logic
 */

jest.mock('sonner', () => ({
  __esModule: true,
  toast: { error: jest.fn() }
}));

const {
  AppError,
  ErrorType,
  classifyError,
  handleClientError,
  handleServerError,
  withErrorHandling,
  getErrorBoundaryFallback
} = require('../../../lib/utils/error-handler');

const { toast } = require('sonner');

describe('AppError', () => {
  it('constructs with defaults and derives userMessage by type', () => {
    const err = new AppError('Auth needed', ErrorType.AUTHENTICATION, 401);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
    expect(err.type).toBe(ErrorType.AUTHENTICATION);
    expect(err.statusCode).toBe(401);
    expect(err.userMessage).toBe('Please sign in to continue');
    expect(err.isOperational).toBe(true);
    expect(typeof err.stack === 'string' || err.stack === undefined).toBe(true);
  });

  it('uses provided userMessage and isOperational', () => {
    const err = new AppError('DB down', ErrorType.DATABASE, 500, 'DB unavailable', false);
    expect(err.userMessage).toBe('DB unavailable');
    expect(err.isOperational).toBe(false);
  });

  it('falls back to UNKNOWN with default message when only message provided', () => {
    const err = new AppError('Something broke');
    expect(err.type).toBe(ErrorType.UNKNOWN);
    expect(err.statusCode).toBe(500);
    expect(err.userMessage).toBe('An unexpected error occurred. Please try again');
  });
});

describe('classifyError', () => {
  it('returns AppError instances unchanged (idempotent)', () => {
    const original = new AppError('Already classified', ErrorType.NETWORK, 503);
    const res = classifyError(original);
    expect(res).toBe(original);
  });

  it('classifies authentication-related errors (precedence over generic "invalid")', () => {
    const res = classifyError(new Error('Invalid login credentials'));
    expect(res.type).toBe(ErrorType.AUTHENTICATION);
    expect(res.statusCode).toBe(401);
    expect(res.userMessage).toBe('Please sign in to continue');
  });

  it('classifies authorization errors', () => {
    const res = classifyError(new Error('Permission denied for action'));
    expect(res.type).toBe(ErrorType.AUTHORIZATION);
    expect(res.statusCode).toBe(403);
  });

  it('classifies validation errors', () => {
    const res = classifyError(new Error('Field is required and must be an email'));
    expect(res.type).toBe(ErrorType.VALIDATION);
    expect(res.statusCode).toBe(400);
  });

  it('classifies network errors', () => {
    const res = classifyError(new Error('Network timeout during fetch connection'));
    expect(res.type).toBe(ErrorType.NETWORK);
    expect(res.statusCode).toBe(503);
  });

  it('classifies rate limiting', () => {
    const res = classifyError(new Error('Too many requests - rate limit exceeded'));
    expect(res.type).toBe(ErrorType.RATE_LIMIT);
    expect(res.statusCode).toBe(429);
  });

  it('classifies not found', () => {
    const res = classifyError(new Error('User not found in system'));
    expect(res.type).toBe(ErrorType.NOT_FOUND);
    expect(res.statusCode).toBe(404);
  });

  it('classifies database errors', () => {
    const res = classifyError(new Error('SQL constraint violation'));
    expect(res.type).toBe(ErrorType.DATABASE);
    expect(res.statusCode).toBe(500);
  });

  it('defaults to unknown for generic Error', () => {
    const res = classifyError(new Error('Something mysterious'));
    expect(res.type).toBe(ErrorType.UNKNOWN);
    expect(res.statusCode).toBe(500);
  });

  it('handles non-Error values and strings', () => {
    const res1 = classifyError('plain string error');
    expect(res1).toBeInstanceOf(AppError);
    expect(res1.message).toBe('plain string error');

    const res2 = classifyError({ any: 'object' } as unknown);
    expect(res2.type).toBe(ErrorType.UNKNOWN);
    expect(res2.message).toBe('An unknown error occurred');
  });
});

describe('handleClientError', () => {
  let origEnv: string | undefined;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    origEnv = process.env.NODE_ENV;
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    consoleErrorSpy.mockRestore();
  });

  it('logs in development mode', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('jwt invalid');
    const appErr = handleClientError(err, false);
    expect(appErr.type).toBe(ErrorType.AUTHENTICATION);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [label, payload] = consoleErrorSpy.mock.calls[0];
    expect(label).toBe('Client Error:');
    expect(payload).toMatchObject({
      message: appErr.message,
      type: appErr.type,
      statusCode: appErr.statusCode
    });
  });

  it('does not log when NODE_ENV is not development', () => {
    process.env.NODE_ENV = 'test';
    handleClientError(new Error('forbidden access'), false);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('shows AUTHENTICATION toast with correct title and description', () => {
    handleClientError(new Error('Invalid login credentials'));
    expect(toast.error).toHaveBeenCalledWith('Sign in required', {
      description: 'Please sign in to continue'
    });
  });

  it('shows AUTHORIZATION toast with correct title and description', () => {
    handleClientError(new Error('permission denied'));
    expect(toast.error).toHaveBeenCalledWith('Access denied', {
      description: 'You do not have permission to perform this action'
    });
  });

  it('shows VALIDATION toast', () => {
    handleClientError(new Error('input required and must be valid'));
    expect(toast.error).toHaveBeenCalledWith('Invalid input', {
      description: 'Please check your input and try again'
    });
  });

  it('shows NETWORK toast', () => {
    handleClientError(new Error('network connection timeout while fetch'));
    expect(toast.error).toHaveBeenCalledWith('Connection error', {
      description: 'Network error. Please check your connection and try again'
    });
  });

  it('shows RATE_LIMIT toast', () => {
    handleClientError(new Error('Too many requests - rate limit'));
    expect(toast.error).toHaveBeenCalledWith('Too many requests', {
      description: 'Too many requests. Please wait a moment before trying again'
    });
  });

  it('uses default toast for unknown errors', () => {
    handleClientError(new Error('weird thing happened'));
    expect(toast.error).toHaveBeenCalledWith('Error', {
      description: 'An unexpected error occurred. Please try again'
    });
  });

  it('respects showToast=false', () => {
    handleClientError(new Error('network timeout'), false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('uses provided AppError.userMessage when passed an AppError', () => {
    const ae = new AppError('custom', ErrorType.VALIDATION, 400, 'Custom message');
    handleClientError(ae);
    expect(toast.error).toHaveBeenCalledWith('Invalid input', {
      description: 'Custom message'
    });
  });
});

describe('handleServerError', () => {
  it('logs payload with timestamp and returns AppError', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
    const fixed = new Date('2025-01-01T00:00:00.000Z');
    jest.setSystemTime(fixed);

    const res = handleServerError(new Error('does not exist'));
    expect(res).toBeInstanceOf(AppError);
    expect(res.type).toBe(ErrorType.NOT_FOUND);
    expect(spy).toHaveBeenCalledTimes(1);
    const [label, payload] = spy.mock.calls[0];
    expect(label).toBe('Server Error:');
    expect(payload).toMatchObject({
      message: res.message,
      type: res.type,
      statusCode: res.statusCode
    });
    expect(typeof payload.stack === 'string' || payload.stack === undefined).toBe(true);
    expect(payload.timestamp).toBe(fixed.toISOString());

    spy.mockRestore();
    jest.useRealTimers();
  });
});

describe('withErrorHandling', () => {
  it('returns resolved value on success', async () => {
    const fn = async (x: number) => x * 2;
    const wrapped = withErrorHandling(fn);
    await expect(wrapped(3)).resolves.toBe(6);
  });

  it('rethrows AppError unchanged if function throws AppError', async () => {
    const thrown = new AppError('Too many requests', ErrorType.RATE_LIMIT, 429);
    const fn = async () => { throw thrown; };
    const wrapped = withErrorHandling(fn);
    await expect(wrapped()).rejects.toBe(thrown);
  });

  it('classifies non-AppError and throws AppError', async () => {
    const fn = async () => { throw new Error('validation failed: required'); };
    const wrapped = withErrorHandling(fn);
    await expect(wrapped()).rejects.toEqual(expect.objectContaining({
      type: ErrorType.VALIDATION,
      statusCode: 400
    }));
  });
});

describe('getErrorBoundaryFallback', () => {
  it('maps titles/messages and allows retry except for AUTHORIZATION', () => {
    const make = (type: any, msg: string) => new AppError(msg, type, 400);
    const noop = () => {};

    const auth = getErrorBoundaryFallback(make(ErrorType.AUTHENTICATION, 'signin'), noop);
    expect(auth.title).toBe('Authentication Required');
    expect(auth.message).toBe('Please sign in to continue');
    expect(auth.canRetry).toBe(true);
    expect(auth.onRetry).toBe(noop);

    const authz = getErrorBoundaryFallback(make(ErrorType.AUTHORIZATION, 'nope'), noop);
    expect(authz.title).toBe('Access Denied');
    expect(authz.message).toBe('You do not have permission to perform this action');
    expect(authz.canRetry).toBe(false);

    const val = getErrorBoundaryFallback(make(ErrorType.VALIDATION, 'bad'), noop);
    expect(val.title).toBe('Invalid Input');

    const net = getErrorBoundaryFallback(make(ErrorType.NETWORK, 'conn'), noop);
    expect(net.title).toBe('Connection Error');

    const nf = getErrorBoundaryFallback(make(ErrorType.NOT_FOUND, 'missing'), noop);
    expect(nf.title).toBe('Not Found');

    const rl = getErrorBoundaryFallback(make(ErrorType.RATE_LIMIT, 'slow'), noop);
    expect(rl.title).toBe('Too Many Requests');

    const unk = getErrorBoundaryFallback(new Error('random') as any, noop);
    expect(unk.title).toBe('Something Went Wrong');
  });
});
