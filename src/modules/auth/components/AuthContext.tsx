import { createContext, useContext, ReactNode } from 'react'
import { useAuthOptimized } from '@/modules/auth/hooks/useAuthQuery'

// Create context
const AuthContext = createContext<ReturnType<typeof useAuthOptimized> | undefined>(undefined)

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const authData = useAuthOptimized()
  
  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
