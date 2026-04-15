import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'

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

  if (requireOnboarding && !isOnboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
