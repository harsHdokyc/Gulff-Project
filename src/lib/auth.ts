import { supabase } from './supabase'
import type { AuthError, User } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  loading: boolean
  isOnboarded: boolean
}

export interface SignUpData {
  email: string
  password: string
  company: string
  whatsapp?: string
}

export interface SignInData {
  email: string
  password: string
}

// Auth service class
export class AuthService {
  private static instance: AuthService
  private authStateCallbacks: Set<(state: AuthState) => void> = new Set()

  private constructor() {
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (state: AuthState) => void) {
    this.authStateCallbacks.add(callback)
    
    // Initial state
    this.notifyAuthState()
    
    // Set up Supabase listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        this.notifyAuthState()
      }
    )
    
    return () => {
      subscription.unsubscribe()
      this.authStateCallbacks.delete(callback)
    }
  }

  // Get current auth state
  async getAuthState(): Promise<AuthState> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth getUser timeout')), 5000)
      })
      
      const { data: { user }, error } = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ])
      
      if (error) {
        // Fallback to getSession on timeout
        if (error.message === 'Auth getUser timeout') {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const isOnboarded = await this.checkOnboardingStatus(session.user.id)
            return { user: session.user, loading: false, isOnboarded }
          }
        }
        return { user: null, loading: false, isOnboarded: false }
      }
      
      if (!user) {
        return { user: null, loading: false, isOnboarded: false }
      }
      
      const isOnboarded = await this.checkOnboardingStatus(user.id)
      return { user, loading: false, isOnboarded }
    } catch (error) {
      return { user: null, loading: false, isOnboarded: false }
    }
  }

  // Sign up with email
  async signUp(data: SignUpData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            company: data.company,
            whatsapp: data.whatsapp,
            onboarding_completed: false
          }
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Signup failed' }
    }
  }

  // Sign in with email
  async signIn(data: SignInData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Sign in failed' }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  // Send OTP verification
  async sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to send verification' }
    }
  }

  // Verify OTP
  async verifyOTP(token: string, email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: 'signup',
        email
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Verification failed' }
    }
  }

  // Check onboarding status
  async checkOnboardingStatus(userId: string): Promise<boolean> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      })
      
      const { data, error } = await Promise.race([
        supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', userId)
          .maybeSingle(),
        timeoutPromise
      ])

      if (error) {
        // If it's a permission error or table doesn't exist, fall back to auth metadata.
        if (error.code === 'PGRST301' || error.code === '42P01') {
          const { data: authData } = await supabase.auth.getUser()
          return !!authData.user?.user_metadata?.onboarding_completed
        }
        return false
      }

      // maybeSingle() returns null when row is missing or not visible by policy.
      // In that case, fall back to auth metadata instead of trying to insert a row.
      if (!data) {
        const { data: authData } = await supabase.auth.getUser()
        return !!authData.user?.user_metadata?.onboarding_completed
      }

      return data.onboarding_completed || false
    } catch (error) {
      // If any exception occurs, assume not onboarded rather than hanging
      return false
    }
  }

  // Update onboarding status
  async completeOnboarding(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Keep auth metadata in sync so route guards have a reliable fallback.
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      })

      // Do not fail onboarding completion if auth metadata update is blocked.
      // The canonical source remains the users table flag.
      if (metadataError) {
        return { success: true }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: 'Failed to complete onboarding' }
    }
  }

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  // Refresh session
  async refreshSession() {
    const { data: { session } } = await supabase.auth.refreshSession()
    return session
  }

  // Notify all callbacks of auth state change
  private async notifyAuthState() {
    try {
      const state = await this.getAuthState()
      this.authStateCallbacks.forEach(callback => callback(state))
    } catch (error) {
      // Silently handle errors to prevent infinite loops
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
