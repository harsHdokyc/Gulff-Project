import { useParams } from 'react-router-dom';
import { useAuthContext } from '@/modules/auth/components/AuthContext';

export function useCurrentOrganization() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuthContext();

  // Get organization ID from URL or fallback to user's default company
  const getOrganizationId = (): string | null => {
    console.log('🏢 [useCurrentOrganization] orgId from URL:', orgId);
    
    // If we're in an organization route, use the orgId from URL
    if (orgId) {
      console.log('🏢 [useCurrentOrganization] Using orgId from URL:', orgId);
      return orgId;
    }

    // For non-organization routes, return null (components will use their default behavior)
    console.log('🏢 [useCurrentOrganization] No orgId in URL, returning null');
    return null;
  };

  const organizationId = getOrganizationId();

  console.log('🏢 [useCurrentOrganization] Final organizationId:', organizationId, 'isOrganizationContext:', !!orgId);

  return {
    organizationId,
    isOrganizationContext: !!orgId,
  };
}
