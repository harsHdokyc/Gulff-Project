import { Navigate, useLocation } from 'react-router-dom'
import { useRef } from 'react'
import { useAuthContext } from '@/modules/auth/components/AuthContext'
import { ROUTES } from '@/routes/constants'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, isOnboarded } = useAuthContext()
  const location = useLocation()
  const hasRedirectedRef = useRef(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    const userRole = user.app_metadata?.role || user.user_metadata?.role

    if (userRole === 'pro' && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      const from = location.state?.from?.pathname
      
      // If PRO user was trying to access a specific protected route, preserve that
      if (from && from !== '/signin' && from !== '/signup' && from !== '/onboarding') {
        return <Navigate to={from} replace />
      }
      
      return <Navigate to={ROUTES.PROTECTED.DASHBOARD} replace />
    }

    const redirectPath = isOnboarded ? ROUTES.PROTECTED.DASHBOARD : ROUTES.ONBOARDING
    const from = location.state?.from?.pathname

    // If coming from a specific route, preserve that route after onboarding
    if (from && from !== '/signin' && from !== '/signup' && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      return <Navigate to={from} replace />
    }
    
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
