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

  private constructor() {}

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
        await this.notifyAuthState()
      }
    )

    return () => {
      subscription.unsubscribe()
      this.authStateCallbacks.delete(callback)
    }
  }

  // Get current auth state
  async getAuthState(): Promise<AuthState> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        user: null,
        loading: false,
        isOnboarded: false
      }
    }

    const isOnboarded = await this.checkOnboardingStatus(user.id)
    
    return {
      user,
      loading: false,
      isOnboarded
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
  private async checkOnboardingStatus(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return false
      }

      return data.onboarding_completed || false
    } catch {
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
    const state = await this.getAuthState()
    this.authStateCallbacks.forEach(callback => callback(state))
  }
}

// Export singleton instance
export const authService = AuthService.getInstance()
