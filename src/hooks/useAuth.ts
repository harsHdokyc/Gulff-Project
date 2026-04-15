import { useState, useEffect } from 'react'
import { authService, type AuthState } from '@/lib/auth'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    isOnboarded: false
  })

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange(setAuthState)
    
    return unsubscribe
  }, [])

  const signOut = async () => {
    await authService.signOut()
  }

  const completeOnboarding = async (userId: string) => {
    await authService.completeOnboarding(userId)
  }

  return {
    ...authState,
    signOut,
    completeOnboarding
  }
}
