import { useParams } from 'react-router-dom';
import { useAuthContext } from '@/modules/auth/components/AuthContext';

export function useCurrentOrganization() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuthContext();

  // Get organization ID from URL or fallback to user's default company
  const getOrganizationId = (): string | null => {
    
    // If we're in an organization route, use the orgId from URL
    if (orgId) {
      return orgId;
    }

    // For non-organization routes, return null (components will use their default behavior)
    return null;
  };

  const organizationId = getOrganizationId();


  return {
    organizationId,
    isOrganizationContext: !!orgId,
  };
}
