import { ReactNode } from 'react'
import { useAuthOptimized } from '@/hooks/useAuthQuery'

interface AuthProviderProps {
  children: ReactNode
}

// This component ensures useAuth is called only once at the top level
export function AuthProvider({ children }: AuthProviderProps) {
  // Call useAuth once and provide context to children
  const authData = useAuthOptimized()
  
  // You could use Context here if needed, but for now just render children
  // The auth queries will be cached by TanStack Query automatically
  return <>{children}</>
}
