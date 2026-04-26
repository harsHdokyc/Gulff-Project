import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import { ProtectedRoute } from "@/modules/auth/components/ProtectedRoute";
import { ExcludeRolesRoute } from "@/modules/auth/components/ExcludeRolesRoute";
import { AuthGuard } from "@/modules/auth/components/AuthGuard";
import { ROUTES } from "./constants";

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <div className="text-sm text-muted-foreground">Loading page...</div>
    </div>
  </div>
);

// Lazy loaded Public Components
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const FeaturesPage = lazy(() => import("@/pages/FeaturesPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Lazy loaded Auth Components
const SignUpPage = lazy(() => import("@/modules/auth/components/SignUpPage"));
const SignInPage = lazy(() => import("@/modules/auth/components/SignInPage"));
const ResetPasswordPage = lazy(() => import("@/modules/auth/components/ResetPasswordPage"));

// Lazy loaded Protected Components
const OnboardingPage = lazy(() => import("@/modules/auth/components/OnboardingPage"));
const DashboardPage = lazy(() => import("@/modules/dashboard/components/DashboardPage"));
const CompliancePage = lazy(() => import("@/modules/compliance/components/CompliancePage"));
const EmployeesPage = lazy(() => import("@/modules/user-management/components/EmployeesPage"));
const DocumentsPage = lazy(() => import("@/modules/documents/components/DocumentsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const UserManagementPage = lazy(() => import("@/modules/user-management/components/UserManagementPage"));
const ProAssociationRequestsPage = lazy(() => import("@/modules/user-management/components/ProAssociationRequestsPage"));

export function AppRoutes() {
  const { user, loading, isOnboarded } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - Always accessible */}
      <Route path={ROUTES.PUBLIC.HOME} element={
        <Suspense fallback={<PageLoader />}>
          <LandingPage />
        </Suspense>
      } />
      <Route path={ROUTES.PUBLIC.ABOUT} element={
        <Suspense fallback={<PageLoader />}>
          <AboutPage />
        </Suspense>
      } />
      <Route path={ROUTES.PUBLIC.FEATURES} element={
        <Suspense fallback={<PageLoader />}>
          <FeaturesPage />
        </Suspense>
      } />
      <Route path={ROUTES.PUBLIC.PRIVACY} element={
        <Suspense fallback={<PageLoader />}>
          <PrivacyPage />
        </Suspense>
      } />
      <Route path={ROUTES.PUBLIC.TERMS} element={
        <Suspense fallback={<PageLoader />}>
          <TermsPage />
        </Suspense>
      } />
      <Route path={ROUTES.AUTH.RESET_PASSWORD} element={
        <Suspense fallback={<PageLoader />}>
          <ResetPasswordPage />
        </Suspense>
      } />

      {/* Auth Routes - Only when not authenticated */}
      <Route 
        path={ROUTES.AUTH.SIGNUP} 
        element={
          <AuthGuard>
            <Suspense fallback={<PageLoader />}>
              <SignUpPage />
            </Suspense>
          </AuthGuard>
        } 
      />
      <Route 
        path={ROUTES.AUTH.SIGNIN} 
        element={
          <AuthGuard>
            <Suspense fallback={<PageLoader />}>
              <SignInPage />
            </Suspense>
          </AuthGuard>
        } 
      />
      
      {/* Onboarding Route - Authenticated but not onboarded */}
      <Route 
        path={ROUTES.ONBOARDING} 
        element={
          <ProtectedRoute requireOnboarding={false}>
            <Suspense fallback={<PageLoader />}>
              <OnboardingPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Routes - Authenticated and onboarded only */}
      <Route 
        path={ROUTES.PROTECTED.DASHBOARD} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.COMPLIANCE} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <CompliancePage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.EMPLOYEES} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <EmployeesPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.DOCUMENTS} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <DocumentsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.SETTINGS} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      {/* Organization-based Routes - For PRO users */}
      <Route 
        path={ROUTES.ORGANIZATION.DASHBOARD} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.ORGANIZATION.COMPLIANCE} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <CompliancePage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.ORGANIZATION.EMPLOYEES} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <EmployeesPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.ORGANIZATION.DOCUMENTS} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <DocumentsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.ORGANIZATION.SETTINGS} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.USER_MANAGEMENT} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <ExcludeRolesRoute excludeRoles={["employee", "pro"]}>
              <Suspense fallback={<PageLoader />}>
                <UserManagementPage />
              </Suspense>
            </ExcludeRolesRoute>
          </ProtectedRoute>
        } 
      />
      <Route
        path={ROUTES.PROTECTED.ASSOCIATION_REQUESTS}
        element={
          <ProtectedRoute requireOnboarding={true}>
            <ExcludeRolesRoute excludeRoles={["owner", "employee"]}>
              <Suspense fallback={<PageLoader />}>
                <ProAssociationRequestsPage />
              </Suspense>
            </ExcludeRolesRoute>
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route 
        path="*" 
        element={
          user ? (
            <Navigate to={isOnboarded ? ROUTES.PROTECTED.DASHBOARD : ROUTES.ONBOARDING} replace />
          ) : (
            <Navigate to={ROUTES.PUBLIC.HOME} replace />
          )
        } 
      />
    </Routes>
  );
}
