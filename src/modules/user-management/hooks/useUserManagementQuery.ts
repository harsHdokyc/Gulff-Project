import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  userManagementService,
  type User,
  type ProSearchResult,
  type ProBusinessRequest,
  type CreateProAssociationRequest,
} from '@/modules/user-management/services/userManagementService'
import { toast } from '@/hooks/use-toast'

export const userManagementKeys = {
  all: ['user-management'] as const,
  users: (authUserId: string) =>
    [...userManagementKeys.all, 'users', authUserId] as const,
  proSearch: (query: string) =>
    [...userManagementKeys.all, 'pro-search', query] as const,
  associationRequests: (authUserId: string) =>
    [...userManagementKeys.all, 'association-requests', authUserId] as const,
  proAssociationRequests: (authUserId: string) =>
    [...userManagementKeys.all, 'pro-association-requests', authUserId] as const,
}

function invalidateManagedUsers(
  queryClient: QueryClient,
  authUserId?: string
) {
  if (authUserId) {
    void queryClient.invalidateQueries({
      queryKey: userManagementKeys.users(authUserId),
    })
  }
}

/**
 * Company user list for the owner user-management page.
 * Scoped by auth user id so the cache does not bleed across accounts.
 */
// pageIndex / pageSize reserved if server pagination is re-enabled for this list
export function useManagedUsers(authUserId?: string, params?: { /* pageIndex?: number; pageSize?: number; */ search?: string; role?: string }) {
  return useQuery({
    queryKey: [...userManagementKeys.users(authUserId ?? ''), params ?? {}],
    queryFn: async (): Promise<{ users: User[]; total: number }> => {
      const result = await userManagementService.getUsers(params)
      if (!result.success) {
        throw new Error(result.error || 'Failed to load users')
      }
      return {
        users: result.data ?? [],
        total: result.total ?? 0
      }
    },
    enabled: !!authUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : ''
      if (
        message.includes('Access denied') ||
        message.includes('Only owners')
      ) {
        return false
      }
      return failureCount < 3
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}


export function useUpdateManagedUser(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      full_name,
      displayName,
    }: {
      userId: string
      full_name: string
      displayName: string
    }) => {
      const result = await userManagementService.updateUser(userId, {
        display_name: displayName,
      })
      if (!result.success) {
        throw new Error(result.error || 'Failed to update user')
      }
      return displayName
    },
    onSuccess: (_, variables) => {
      invalidateManagedUsers(queryClient, authUserId)
      toast({
        title: 'User updated successfully',
        description: `${variables.displayName}'s information has been updated.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update user',
        description:
          error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteManagedUser(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      label,
    }: {
      userId: string
      label: string
    }) => {
      const result = await userManagementService.deleteUser(userId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user')
      }
      return label
    },
    onSuccess: (label) => {
      invalidateManagedUsers(queryClient, authUserId)
      toast({
        title: 'User deleted successfully',
        description: `${label} has been removed from your business.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete user',
        description:
          error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Search for PRO users across all companies
 */
export function useProSearch(query: string) {
  return useQuery({
    queryKey: userManagementKeys.proSearch(query),
    queryFn: async (): Promise<ProSearchResult[]> => {
      const result = await userManagementService.searchPros(query)
      if (!result.success) {
        throw new Error(result.error || 'Failed to search PROs')
      }
      return result.data || []
    },
    enabled: query.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

/**
 * Get association requests for the current business
 */
export function useBusinessAssociationRequests(authUserId?: string) {
  return useQuery({
    queryKey: userManagementKeys.associationRequests(authUserId ?? ''),
    queryFn: async (): Promise<ProBusinessRequest[]> => {
      const result = await userManagementService.getBusinessAssociationRequests()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load association requests')
      }
      return result.data || []
    },
    enabled: !!authUserId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  })
}

/**
 * Create a PRO association request
 */
export function useCreateProAssociationRequest(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProAssociationRequest) => {
      const result = await userManagementService.createProAssociationRequest(data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to send association request')
      }
    },
    onSuccess: () => {
      // Invalidate association requests and users list
      if (authUserId) {
        void queryClient.invalidateQueries({
          queryKey: userManagementKeys.associationRequests(authUserId),
        })
        void queryClient.invalidateQueries({
          queryKey: userManagementKeys.users(authUserId),
        })
      }
      toast({
        title: 'Association request sent',
        description: 'Your request has been sent to the PRO. They will review it and respond.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to send request',
        description:
          error instanceof Error ? error.message : 'Failed to send association request',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Get association requests assigned to the current PRO user
 */
export function useProAssociationRequests(authUserId?: string) {
  return useQuery({
    queryKey: userManagementKeys.proAssociationRequests(authUserId ?? ''),
    queryFn: async (): Promise<ProBusinessRequest[]> => {
      const result = await userManagementService.getProAssociationRequests()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load PRO association requests')
      }
      return result.data || []
    },
    enabled: !!authUserId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  })
}

/**
 * Update association request status (accept/reject) - for PROs
 */
export function useUpdateAssociationRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      status 
    }: { 
      requestId: string
      status: 'accepted' | 'rejected' 
    }) => {
      const result = await userManagementService.updateAssociationRequest(requestId, status)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update request')
      }
      return { requestId, status }
    },
    onSuccess: ({ status }) => {
      // Invalidate all association requests queries
      void queryClient.invalidateQueries({
        queryKey: userManagementKeys.all,
      })
      toast({
        title: `Request ${status}`,
        description: `The association request has been ${status}.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update request',
        description:
          error instanceof Error ? error.message : 'Failed to update association request',
        variant: 'destructive',
      })
    },
  })
}

