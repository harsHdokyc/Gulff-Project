import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  userManagementService,
  type CreateUserData,
  type User,
} from '@/lib/userManagementService'
import { toast } from '@/hooks/use-toast'

export const userManagementKeys = {
  all: ['user-management'] as const,
  users: (authUserId: string) =>
    [...userManagementKeys.all, 'users', authUserId] as const,
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
export function useManagedUsers(authUserId?: string) {
  return useQuery({
    queryKey: userManagementKeys.users(authUserId ?? ''),
    queryFn: async (): Promise<User[]> => {
      const result = await userManagementService.getUsers()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load users')
      }
      return result.data ?? []
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

export function useCreateManagedUser(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const result = await userManagementService.createUser(data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create user')
      }
    },
    onSuccess: (_, variables) => {
      invalidateManagedUsers(queryClient, authUserId)
      toast({
        title: 'User created successfully',
        description: `${variables.email} can sign in with the password you set.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create user',
        description:
          error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      })
    },
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
        full_name,
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

