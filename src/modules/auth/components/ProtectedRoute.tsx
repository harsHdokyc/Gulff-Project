import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/modules/auth/components/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireOnboarding?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireOnboarding = true,
  redirectTo = '/signin' 
}: ProtectedRouteProps) {
  const { user, loading, isOnboarded } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  // Defensive bypass: PRO users should never be blocked by owner onboarding flow.
  const userRole = user.app_metadata?.role || user.user_metadata?.role
  const isProUser = userRole === 'pro'

  if (requireOnboarding && isProUser) {
    return <>{children}</>
  }

  if (requireOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
