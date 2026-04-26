// Route paths
export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    ABOUT: '/about',
    FEATURES: '/features',
    PRIVACY: '/privacy',
    TERMS: '/terms',
  },
  AUTH: {
    SIGNUP: '/signup',
    SIGNIN: '/signin',
    RESET_PASSWORD: '/reset-password',
  },
  ONBOARDING: '/onboarding',
  PROTECTED: {
    DASHBOARD: '/dashboard',
    COMPLIANCE: '/compliance',
    EMPLOYEES: '/employees',
    DOCUMENTS: '/documents',
    SETTINGS: '/settings',
    USER_MANAGEMENT: '/user-management',
    ASSOCIATION_REQUESTS: '/association-requests',
  },
  ORGANIZATION: {
    BASE: '/org/:orgId',
    DASHBOARD: '/org/:orgId/dashboard',
    COMPLIANCE: '/org/:orgId/compliance',
    EMPLOYEES: '/org/:orgId/employees',
    DOCUMENTS: '/org/:orgId/documents',
    SETTINGS: '/org/:orgId/settings',
  },
} as const;

// Route types for type safety
export type PublicRoute = typeof ROUTES.PUBLIC[keyof typeof ROUTES.PUBLIC];
export type AuthRoute = typeof ROUTES.AUTH[keyof typeof ROUTES.AUTH];
export type ProtectedRoute = typeof ROUTES.PROTECTED[keyof typeof ROUTES.PROTECTED];
