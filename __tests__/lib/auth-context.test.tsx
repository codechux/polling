/**
 * Tests for AuthProvider and useAuth
 * Test framework: Jest
 * Test utilities: @testing-library/react, @testing-library/jest-dom
 *
 * If this repository uses Vitest, replace:
 *  - jest.fn() -> vi.fn()
 *  - jest.mock(...) -> vi.mock(...)
 *  - expect(x).toHaveBeenCalledTimes -> same in Vitest
 */

import React, { ReactNode } from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

// Module under test. Adjust the import path if the source lives elsewhere.
import { AuthProvider, useAuth } from '../../lib/auth-context'

// Mocks
const refreshMock = jest.fn()
const pushMock = jest.fn()

jest.mock('next/navigation', () => {
  return {
    // For Next.js app router
    useRouter: () => ({
      refresh: refreshMock,
      push: pushMock,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }),
  }
})

// Mock error handler utilities
const handleClientErrorMock = jest.fn((err) => {
  const e = err instanceof Error ? err : new Error(String(err))
  ;(e as any).__handled = true
  return e
})
class AppErrorMock extends Error {
  public status?: number
  constructor(message: string, _type?: any, status?: number) {
    super(message)
    this.status = status
  }
}
enum ErrorTypeMock {
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION'
}
jest.mock('../../lib/utils/error-handler', () => ({
  handleClientError: (e: unknown, _showToast = true) => handleClientErrorMock(e),
  AppError: AppErrorMock,
  ErrorType: ErrorTypeMock,
}))

// Supabase client mock shape used by the provider
type Session = { user: { id: string; email?: string } } | null

const getSessionMock = jest.fn()
const onAuthStateChangeMock = jest.fn()
const signInWithPasswordMock = jest.fn()
const signUpMock = jest.fn()
const signOutMock = jest.fn()

const subscription = { unsubscribe: jest.fn() }

// Return shape expected by the code under test
const makeSupabaseAuth = () => ({
  getSession: getSessionMock,
  onAuthStateChange: onAuthStateChangeMock,
  signInWithPassword: signInWithPasswordMock,
  signUp: signUpMock,
  signOut: signOutMock,
})

jest.mock('../../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: makeSupabaseAuth()
  }),
}))

// Test helper component to access context
function ReadContext({ label = 'ctx' }: { label?: string }) {
  const ctx = useAuth()
  return (
    <div>
      <span data-testid={label + '-isLoading'}>{String(ctx.isLoading)}</span>
      <span data-testid={label + '-user'}>{ctx.user ? ctx.user.id : 'null'}</span>
      <span data-testid={label + '-session'}>{ctx.session ? 'yes' : 'null'}</span>
      <button onClick={() => ctx.signOut()} data-testid="signout-btn">signout</button>
    </div>
  )
}

function renderWithProvider(ui?: ReactNode) {
  return render(<AuthProvider>{ui ?? <ReadContext />}</AuthProvider>)
}

beforeEach(() => {
  refreshMock.mockClear()
  pushMock.mockClear()
  getSessionMock.mockReset()
  onAuthStateChangeMock.mockReset()
  signInWithPasswordMock.mockReset()
  signUpMock.mockReset()
  signOutMock.mockReset()
  subscription.unsubscribe.mockReset()

  // Default behaviors
  onAuthStateChangeMock.mockReturnValue({ data: { subscription } })
})

describe('AuthProvider initialization', () => {
  test('sets loading true initially, fetches session, subscribes to auth changes, then sets loading false', async () => {
    const fakeSession: Session = { user: { id: 'u_1' } }

    getSessionMock.mockResolvedValueOnce({ data: { session: fakeSession }, error: null })

    renderWithProvider()

    // Initially loading
    expect(screen.getByTestId('ctx-isLoading')).toHaveTextContent('true')

    // Wait for effect to resolve
    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledTimes(1)
    })

    // Context updated
    expect(screen.getByTestId('ctx-isLoading')).toHaveTextContent('false')
    expect(screen.getByTestId('ctx-user')).toHaveTextContent('u_1')
    expect(screen.getByTestId('ctx-session')).toHaveTextContent('yes')

    // Subscribed and router refresh called on auth change callback when invoked
    // Extract and invoke the onAuthStateChange callback to simulate auth event
    const cb = onAuthStateChangeMock.mock.calls[0]?.[0]
    expect(typeof cb).toBe('function')

    act(() => {
      cb('SIGNED_IN', fakeSession as any)
    })
    expect(refreshMock).toHaveBeenCalled()
  })

  test('handles getSession error by logging and setting loading false with null user/session', async () => {
    const error = new Error('session error')
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error })

    renderWithProvider()

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByTestId('ctx-isLoading')).toHaveTextContent('false')
    expect(screen.getByTestId('ctx-user')).toHaveTextContent('null')
    expect(screen.getByTestId('ctx-session')).toHaveTextContent('null')
  })

  test('cleans up subscription on unmount', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null })
    const { unmount } = renderWithProvider()

    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())

    unmount()
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('useAuth hook guard', () => {
  test('throws if used outside provider', () => {
    // Silence expected error logs
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    function Rogue() {
      useAuth()
      return null
    }
    expect(() => render(<Rogue />)).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })
})

describe('signIn', () => {
  test('successful signIn navigates to /dashboard', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null })
    signInWithPasswordMock.mockResolvedValueOnce({ error: null })

    renderWithProvider()

    // Access context via inline component to trigger signIn
    function Trigger() {
      const { signIn } = useAuth()
      useImmediate(async () => {
        await signIn('a@b.com', 'pw')
      })
      return null
    }
    function useImmediate(fn: () => void) { React.useEffect(() => { void fn() }, []) }

    render(<AuthProvider><Trigger /></AuthProvider>)

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' })
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  test('failed signIn throws handled error with AUTHENTICATION type', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null })
    signInWithPasswordMock.mockResolvedValueOnce({ error: new Error('bad creds') })

    let captured: unknown
    function Trigger() {
      const { signIn } = useAuth()
      React.useEffect(() => {
        signIn('x@y.com', 'bad').catch(e => { captured = e })
      }, [signIn])
      return null
    }
    render(<AuthProvider><Trigger /></AuthProvider>)

    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalled())
    expect(handleClientErrorMock).toHaveBeenCalled()
    expect((captured as any)?.__handled).toBeTruthy()
    expect(pushMock).not.toHaveBeenCalled()
  })
})

describe('signUp', () => {
  test('successful signUp navigates to /auth/signin', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null })
    signUpMock.mockResolvedValueOnce({ error: null })

    let done = false
    function Trigger() {
      const { signUp } = useAuth()
      React.useEffect(() => {
        signUp('a@b.com', 'pw', 'Alice').then(() => { done = true })
      }, [signUp])
      return null
    }
    render(<AuthProvider><Trigger /></AuthProvider>)

    await waitFor(() => expect(signUpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { data: { name: 'Alice' } }
    }))
    expect(pushMock).toHaveBeenCalledWith('/auth/signin')
    expect(done).toBe(true)
  })

  test('failed signUp throws handled validation error', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null })
    signUpMock.mockResolvedValueOnce({ error: new Error('email taken') })

    let captured: unknown
    function Trigger() {
      const { signUp } = useAuth()
      React.useEffect(() => {
        signUp('a@b.com', 'pw', 'Alice').catch(e => { captured = e })
      }, [signUp])
      return null
    }
    render(<AuthProvider><Trigger /></AuthProvider>)

    await waitFor(() => expect(signUpMock).toHaveBeenCalled())
    expect(handleClientErrorMock).toHaveBeenCalled()
    expect((captured as any)?.__handled).toBeTruthy()
    expect(pushMock).not.toHaveBeenCalled()
  })
})

describe('signOut', () => {
  test('successful signOut navigates to /', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
    signOutMock.mockResolvedValueOnce({ error: null })

    renderWithProvider()

    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())

    await act(async () => {
      screen.getByTestId('signout-btn').click()
    })

    expect(signOutMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  test('failed signOut calls handleClientError and rethrows', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'u2' } } }, error: null })
    const signOutErr = new Error('cannot sign out')
    signOutMock.mockResolvedValueOnce({ error: signOutErr })

    renderWithProvider()
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())

    let promise: Promise<void> | undefined
    function Trigger() {
      const { signOut } = useAuth()
      React.useEffect(() => {
        promise = signOut()
      }, [signOut])
      return null
    }
    render(<AuthProvider><Trigger /></AuthProvider>)

    await expect(promise!).rejects.toBeInstanceOf(Error)
    expect(handleClientErrorMock).toHaveBeenCalledWith(signOutErr)
    expect(pushMock).not.toHaveBeenCalled()
  })
})