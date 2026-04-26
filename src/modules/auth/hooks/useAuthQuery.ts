import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService, type AuthState, type SignUpData, type SignInData } from '@/modules/auth/services/auth'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Query keys - ensure they're consistent
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  onboarding: (userId: string) => [...authKeys.all, 'onboarding', userId] as const,
}

// Separate hooks for better caching and less API calls

// Hook for user data only
export function useUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

// Hook for onboarding status only
export function useOnboardingStatusOptimized(userId?: string) {
  return useQuery({
    queryKey: authKeys.onboarding(userId || ''),
    queryFn: () => userId ? authService.checkOnboardingStatus(userId) : false,
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

// Combined auth hook with optimized queries
export function useAuthOptimized() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Separate queries for better caching
  const { data: user, isLoading: isUserLoading, error: userError } = useUser()
  const { data: isOnboarded, isLoading: isOnboardingLoading } = useOnboardingStatusOptimized(user?.id)
  
  // Combined loading state
  const loading = isUserLoading || (!!user && isOnboardingLoading)
  
  // Combined auth state
  const authState: AuthState = {
    user: user || null,
    loading,
    isOnboarded: isOnboarded || false,
  }

  // Set up real-time listener for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Invalidate user query on any auth change
        queryClient.invalidateQueries({ queryKey: authKeys.user() })
        
        // Clear all queries on sign out
        if (event === 'SIGNED_OUT') {
          queryClient.clear()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: (data: SignUpData) => authService.signUp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
  })

  const hydrateUserFromSession = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (u) {
      queryClient.setQueryData(authKeys.user(), u)
    }
    return u
  }, [queryClient])

  // Sign in mutation – avoid optimistic null so AuthGuard sees the user as soon as the session exists
  const signInMutation = useMutation({
    mutationFn: (data: SignInData) => authService.signIn(data),
    onSuccess: async () => {
      await hydrateUserFromSession()
      await queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
  })

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: () => authService.signOut(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: authKeys.user() })
      const previousUser = queryClient.getQueryData(authKeys.user())
      queryClient.setQueryData(authKeys.user(), null)
      queryClient.clear()
      return { previousUser }
    },
    onError: (error, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(authKeys.user(), context.previousUser)
      }
    },
    onSuccess: () => {
      queryClient.clear()
      // Navigate to landing page after successful sign out
      navigate('/')
    },
  })

  // Send OTP mutation
  const sendOTPMutation = useMutation({
    mutationFn: (email: string) => authService.sendOTP(email),
  })

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: ({ token, email }: { token: string; email: string }) => 
      authService.verifyOTP(token, email),
    onSuccess: async () => {
      await hydrateUserFromSession()
      await queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
  })

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: ({ userId, displayName }: { userId: string; displayName?: string }) => authService.completeOnboarding(userId, displayName),
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: authKeys.onboarding(userId) })
      const previousOnboarding = queryClient.getQueryData(authKeys.onboarding(userId))
      queryClient.setQueryData(authKeys.onboarding(userId), true)
      return { previousOnboarding }
    },
    onSuccess: async (_, variables) => {
      // Invalidate both user and onboarding queries to ensure auth state updates
      await queryClient.invalidateQueries({ queryKey: authKeys.user() })
      await queryClient.invalidateQueries({ queryKey: authKeys.onboarding(variables.userId) })
      // Also refresh the session to get updated metadata
      await hydrateUserFromSession()
    },
    onError: (_error, variables, context) => {
      if (context?.previousOnboarding !== undefined) {
        queryClient.setQueryData(authKeys.onboarding(variables.userId), context.previousOnboarding)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: authKeys.onboarding(variables.userId) })
      queryClient.invalidateQueries({ queryKey: authKeys.user() })
    },
  })

  // Manual refetch function
  const refreshAuth = useCallback(() => {
    return queryClient.refetchQueries({ queryKey: authKeys.user() })
  }, [queryClient])

  return {
    // Auth state
    user: authState.user,
    loading: authState.loading,
    isOnboarded: authState.isOnboarded,
    error: userError,
    
    // Mutations
    signUp: signUpMutation.mutateAsync,
    signIn: signInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    sendOTP: sendOTPMutation.mutateAsync,
    verifyOTP: verifyOTPMutation.mutateAsync,
    completeOnboarding: completeOnboardingMutation.mutateAsync,
    
    // Mutation states
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isSendingOTP: sendOTPMutation.isPending,
    isVerifyingOTP: verifyOTPMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
    
    // Utilities
    refreshAuth,
  }
}
