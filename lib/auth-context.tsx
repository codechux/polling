'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createSupabaseBrowserClient } from './supabase'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { handleClientError, AppError, ErrorType } from './utils/error-handler'

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provides authentication state and actions to descendant components.
 *
 * Wraps children with AuthContext and exposes the current `user`, `session`,
 * `isLoading` flag, and three async actions: `signIn`, `signUp`, and `signOut`.
 * The provider initializes and subscribes to Supabase auth state, keeps React
 * state in sync with the Supabase session, and triggers router navigation when
 * authentication actions succeed.
 *
 * The exposed `signIn` and `signUp` functions will throw a normalized AppError
 * (e.g., authentication or validation errors) on failure; `signOut` may also
 * surface errors. Callers should handle these errors (the provider avoids
 * showing UI toasts for `signIn`/`signUp` so callers can manage feedback).
 *
 * @param children - React nodes to be rendered within the provider.
 * @returns A React element that provides authentication context to its children.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  // Memoize auth state change handler to prevent unnecessary re-subscriptions
  const handleAuthStateChange = useCallback((_event: any, session: Session | null) => {
    setSession(session)
    setUser(session?.user ?? null)
    router.refresh()
  }, [router])

  useEffect(() => {
    let mounted = true
    
    const getSession = async () => {
      setIsLoading(true)
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (!mounted) return
      
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      
      setIsLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, handleAuthStateChange])

  // Memoize auth functions to prevent unnecessary re-renders
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new AppError(error.message, ErrorType.AUTHENTICATION, 401)
      }

      router.push('/dashboard')
    } catch (error) {
      throw handleClientError(error, false) // Don't show toast here, let the calling component handle it
    }
  }, [supabase, router])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (error) {
        throw new AppError(error.message, ErrorType.VALIDATION, 400)
      }

      router.push('/auth/signin')
    } catch (error) {
      throw handleClientError(error, false) // Don't show toast here, let the calling component handle it
    }
  }, [supabase, router])

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw new AppError(error.message, ErrorType.AUTHENTICATION, 401)
      }
      
      router.push('/')
    } catch (error) {
      handleClientError(error) // Show toast for sign out errors
      throw error
    }
  }, [supabase, router])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  }), [user, session, isLoading, signIn, signUp, signOut])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}