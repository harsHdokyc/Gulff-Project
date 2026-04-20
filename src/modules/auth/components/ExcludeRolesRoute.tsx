import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/modules/auth/components/AuthContext";
import { useCurrentUserRole } from "@/hooks/useCompanyQuery";
import { ROUTES } from "@/routes/constants";

type Props = {
  children: ReactNode;
  /** If the user's `public.users.role` is in this list, redirect. */
  excludeRoles: readonly string[];
  /** Where to send blocked users (default: dashboard). */
  redirectTo?: string;
};

/**
 * Renders children only when profile role is loaded and not in `excludeRoles`.
 * Use after auth layout so employees cannot open owner-only URLs by typing the path.
 */
export function ExcludeRolesRoute({
  children,
  excludeRoles,
  redirectTo = ROUTES.PROTECTED.DASHBOARD,
}: Props) {
  const { user } = useAuthContext();
  const { data: profileRole, isLoading } = useCurrentUserRole(user?.id);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (profileRole && excludeRoles.includes(profileRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
