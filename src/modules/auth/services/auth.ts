/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
import type { AuthError, User } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  loading: boolean
  isOnboarded: boolean
}

export interface SignUpData {
  email: string
  password: string
  company?: string
  fullName?: string
  whatsapp?: string
  role?: 'owner' | 'pro'
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

  // Check if email already exists
  async checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      // Use the RPC function to check auth.users table directly
      const { data, error } = await supabase.rpc('check_user_email_exists', {
        email_to_check: email
      })
      
      if (error) {
        return { exists: false }
      }
      
      return { exists: !!data }
    } catch (error) {
      return { exists: false }
    }
  }

  // Sign up with email
  async signUp(data: SignUpData): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if email already exists
      const emailCheck = await this.checkEmailExists(data.email)
      
      if (emailCheck.exists) {
        return { success: false, error: 'An account with this email already exists. Please sign in instead.' }
      }
      
      // Prepare user metadata based on role
      const userMetadata: any = {
        onboarding_completed: false,
      }
      
      // Add role-specific metadata
      if (data.role === 'owner') {
        userMetadata.company = data.company
        userMetadata.whatsapp = data.whatsapp
      } else if (data.role === 'pro') {
        userMetadata.role = 'pro'
        userMetadata.onboarding_completed = true
        if (data.fullName) {
          userMetadata.full_name = data.fullName
        }
      }

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: userMetadata
        }
      })

      if (error) {
        const errorMessage = error.message.toLowerCase()
        
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already in use') ||
            errorMessage.includes('duplicate') ||
            errorMessage.includes('already exists')) {
          return { success: false, error: 'An account with this email already exists. Please sign in instead.' }
        }
        
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch {
      return { success: false, error: 'Signup failed' }
    }
  }

  // Send password reset email (Supabase redirects to /reset-password)
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch {
      return { success: false, error: 'Failed to send reset email' }
    }
  }

  // Set a new password (used after recovery link opens a session)
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch {
      return { success: false, error: 'Failed to update password' }
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
    } catch {
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
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      })
      
      const { data, error } = await Promise.race([
        supabase
          .from('users')
          .select('onboarding_completed, company_id, role')
          .eq('id', userId)
          .maybeSingle(),
        timeoutPromise
      ])

      if (error) {
        if (error.code === 'PGRST301' || error.code === '42P01' || error.code === '42P17') {
          const { data: authData } = await supabase.auth.getUser()
          const userRole = authData.user?.app_metadata?.role || authData.user?.user_metadata?.role
          const onboardingCompleted =
            authData.user?.app_metadata?.onboarding_completed ||
            authData.user?.user_metadata?.onboarding_completed
          if (userRole === 'pro') {
            return true
          }
          return !!onboardingCompleted
        }
        return false
      }

      // maybeSingle() returns null when row is missing or not visible by policy.
      // In that case, fall back to auth metadata instead of trying to insert a row.
      if (!data) {
        const { data: authData } = await supabase.auth.getUser()
        const userRole = authData.user?.app_metadata?.role || authData.user?.user_metadata?.role
        const onboardingCompleted =
          authData.user?.app_metadata?.onboarding_completed ||
          authData.user?.user_metadata?.onboarding_completed
        if (userRole === 'pro') {
          return true
        }
        return !!onboardingCompleted
      }

      // Owners complete company onboarding wizard (flag below).
      // PRO invited by an owner already belong to a company — skip onboarding.
      // Self-serve PRO users are also considered onboarded.
      // Merge JWT metadata: if it's a DB trigger once stored self-serve PRO as owner, metadata still says pro.
      const { data: authRow } = await supabase.auth.getUser()
      const metaRole = authRow.user?.app_metadata?.role || authRow.user?.user_metadata?.role
      const metaOnboarding = !!(
        authRow.user?.app_metadata?.onboarding_completed ||
        authRow.user?.user_metadata?.onboarding_completed
      )

      const invitedMember =
        !!data.company_id &&
        data.role === 'pro'

      const isPro = data.role === 'pro' || metaRole === 'pro'

      // For business owners, prioritize DB onboarding_completed flag, but also check metadata
      const dbOnboardingCompleted = !!data.onboarding_completed
      return !!(dbOnboardingCompleted || metaOnboarding || invitedMember || isPro)
    } catch {
      return false
    }
  }

  // Update onboarding status
  async completeOnboarding(userId: string, displayName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('complete_user_onboarding', { user_uuid: userId })

      if (rpcError) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ 
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (dbError) {
          return { success: false, error: dbError.message }
        }
      }

      // Prepare user metadata update
      const userMetadata: any = {
        onboarding_completed: true,
        role: 'owner' // Ensure role is set in metadata
      }

      // Add display name if provided
      if (displayName) {
        userMetadata.display_name = displayName
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: userMetadata
      })

      void data
      void authError

      return { success: true }
    } catch {
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
