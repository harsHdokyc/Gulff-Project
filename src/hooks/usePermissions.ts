import { useAuthContext } from '@/modules/auth/components/AuthContext';

export type UserRole = 'owner' | 'pro';

export interface Permissions {
  canCreateEmployees: boolean;
  canEditEmployees: boolean;
  canDeleteEmployees: boolean;
  canCreateCompliance: boolean;
  canEditCompliance: boolean;
  canDeleteCompliance: boolean;
  canCreateDocuments: boolean;
  canEditDocuments: boolean;
  canDeleteDocuments: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuthContext();
  const userRole = user?.user_metadata?.role as UserRole || 'pro';

  // Business owners have full CRUD access
  // PRO users have read-only access
  const isOwner = userRole === 'owner';
  const isPro = userRole === 'pro';

  return {
    // Employee permissions
    canCreateEmployees: isOwner,
    canEditEmployees: isOwner,
    canDeleteEmployees: isOwner,

    // Compliance permissions
    canCreateCompliance: isOwner,
    canEditCompliance: isOwner,
    canDeleteCompliance: isOwner,

    // Document permissions
    canCreateDocuments: isOwner,
    canEditDocuments: isOwner,
    canDeleteDocuments: isOwner,
  };
};

export const usePermission = (permission: keyof Permissions): boolean => {
  const permissions = usePermissions();
  return permissions[permission];
};
