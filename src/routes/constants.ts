// Route paths
export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    ABOUT: '/about',
    PRIVACY: '/privacy',
    TERMS: '/terms',
  },
  AUTH: {
    SIGNUP: '/signup',
    SIGNIN: '/signin',
  },
  ONBOARDING: '/onboarding',
  PROTECTED: {
    DASHBOARD: '/dashboard',
    COMPLIANCE: '/compliance',
    EMPLOYEES: '/employees',
    DOCUMENTS: '/documents',
    SETTINGS: '/settings',
  },
} as const;

// Route types for type safety
export type PublicRoute = typeof ROUTES.PUBLIC[keyof typeof ROUTES.PUBLIC];
export type AuthRoute = typeof ROUTES.AUTH[keyof typeof ROUTES.AUTH];
export type ProtectedRoute = typeof ROUTES.PROTECTED[keyof typeof ROUTES.PROTECTED];
