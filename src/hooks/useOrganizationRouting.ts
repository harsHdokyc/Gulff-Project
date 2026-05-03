import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/modules/auth/components/AuthContext';
import { useProCompanies } from '@/hooks/useCompanyQuery';
import { ROUTES } from '@/routes/constants';

export function useOrganizationRouting() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: proCompanies, isLoading: proCompaniesLoading, error: proCompaniesError } = useProCompanies(user?.id);


  // Get current organization ID from URL or fallback
  const getCurrentOrgId = (): string | null => {
    return orgId || null;
  };

  // Navigate to organization-specific route
  const navigateToOrg = (orgId: string, path: string = 'dashboard') => {
    const route = ROUTES.ORGANIZATION[path as keyof typeof ROUTES.ORGANIZATION] || ROUTES.ORGANIZATION.DASHBOARD;
    navigate(route.replace(':orgId', orgId));
  };

  // Check if user has access to this organization
  const hasOrgAccess = (organizationId: string): boolean => {
    if (!proCompanies) return false;
    return proCompanies.some(company => company.id === organizationId);
  };

  // Get default organization for PRO users
  const getDefaultOrg = (): string | null => {
    if (!proCompanies || proCompanies.length === 0) return null;
    return proCompanies[0].id;
  };

  // Handle organization switching
  const switchOrganization = (newOrgId: string) => {
    
    if (!hasOrgAccess(newOrgId)) {
      return;
    }
    
    // Navigate to same page but with new org ID
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/');
    const pathIndex = pathSegments.indexOf('org') + 2; // Get index after org/:orgId
    const currentRoute = pathSegments[pathIndex] || 'dashboard';
    
    
    navigateToOrg(newOrgId, currentRoute);
  };

  return {
    currentOrgId: getCurrentOrgId(),
    proCompanies,
    hasOrgAccess,
    getDefaultOrg,
    navigateToOrg,
    switchOrganization,
    isOrgRoute: !!orgId,
  };
}
