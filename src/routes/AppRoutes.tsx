import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthGuard } from "@/components/AuthGuard";
import { ROUTES } from "./constants";

// Public Components
import LandingPage from "@/pages/LandingPage";
import AboutPage from "@/pages/AboutPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "@/pages/NotFound";

// Auth Components
import SignUpPage from "@/pages/SignUpPage";
import SignInPage from "@/pages/SignInPage";

// Protected Components
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import CompliancePage from "@/pages/CompliancePage";
import EmployeesPage from "@/pages/EmployeesPage";
import DocumentsPage from "@/pages/DocumentsPage";
import SettingsPage from "@/pages/SettingsPage";

export function AppRoutes() {
  const { user, loading, isOnboarded } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - Always accessible */}
      <Route path={ROUTES.PUBLIC.HOME} element={<LandingPage />} />
      <Route path={ROUTES.PUBLIC.ABOUT} element={<AboutPage />} />
      <Route path={ROUTES.PUBLIC.PRIVACY} element={<PrivacyPage />} />
      <Route path={ROUTES.PUBLIC.TERMS} element={<TermsPage />} />
      
      {/* Auth Routes - Only when not authenticated */}
      <Route 
        path={ROUTES.AUTH.SIGNUP} 
        element={
          <AuthGuard>
            <SignUpPage />
          </AuthGuard>
        } 
      />
      <Route 
        path={ROUTES.AUTH.SIGNIN} 
        element={
          <AuthGuard>
            <SignInPage />
          </AuthGuard>
        } 
      />
      
      {/* Onboarding Route - Authenticated but not onboarded */}
      <Route 
        path={ROUTES.ONBOARDING} 
        element={
          <ProtectedRoute requireOnboarding={false}>
            <OnboardingPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Routes - Authenticated and onboarded only */}
      <Route 
        path={ROUTES.PROTECTED.DASHBOARD} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.COMPLIANCE} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <CompliancePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.EMPLOYEES} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <EmployeesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.DOCUMENTS} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <DocumentsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path={ROUTES.PROTECTED.SETTINGS} 
        element={
          <ProtectedRoute requireOnboarding={true}>
            <SettingsPage />
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
