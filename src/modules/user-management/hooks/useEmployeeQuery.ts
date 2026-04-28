import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  employeeService,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
  type Employee,
  type GetEmployeesPageParams,
  type GetEmployeesPageResult,
} from '@/modules/user-management/services/employeeService'
import { toast } from '@/hooks/use-toast'

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: () => [...employeeKeys.lists()] as const,
  page: (pageIndex: number, pageSize: number, search: string, statusKey: string) =>
    [...employeeKeys.all, 'page', pageIndex, pageSize, search, statusKey] as const,
  employees: (authUserId: string) =>
    [...employeeKeys.all, 'employees', authUserId] as const,
}

function invalidateEmployees(
  queryClient: QueryClient,
  authUserId?: string
) {
  if (authUserId) {
    void queryClient.invalidateQueries({
      queryKey: employeeKeys.employees(authUserId),
    })
  }
  // Also invalidate paginated queries
  void queryClient.invalidateQueries({
    queryKey: employeeKeys.all,
  })
}

/**
 * Employee list for the employee management page.
 * Scoped by auth user id so the cache does not bleed across accounts.
 */
export function useEmployees(authUserId?: string, params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: [...employeeKeys.employees(authUserId ?? ''), params ?? {}],
    queryFn: async (): Promise<{ employees: Employee[]; total: number }> => {
      const result = await employeeService.getEmployees(params)
      if (!result.success) {
        throw new Error(result.error || 'Failed to load employees')
      }
      return {
        employees: result.data ?? [],
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

export function useEmployeesPage(params: {
  pageIndex: number
  pageSize: number
  search: string
  status?: string
}) {
  const { pageIndex, pageSize, search, status } = params
  const statusKey = status ?? 'all'

  const queryParams: GetEmployeesPageParams = {
    page: pageIndex,
    pageSize,
    search: search.trim() || undefined,
    status,
  }

  const query = useQuery({
    queryKey: employeeKeys.page(pageIndex, pageSize, search.trim(), statusKey),
    queryFn: async (): Promise<GetEmployeesPageResult> => {
      const result = await employeeService.getEmployeesPage(queryParams)
      if (!result.success) {
        throw new Error(result.error || 'Failed to load employees')
      }
      return result.data!
    },
    placeholderData: keepPreviousData,
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

  const employees = query.data?.employees ?? []
  const total = query.data?.total ?? 0

  return {
    employees,
    total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCreateEmployee(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEmployeeRequest) => {
      const result = await employeeService.createEmployee(data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create employee')
      }
      return result.data
    },
    onSuccess: (newEmployee) => {
      invalidateEmployees(queryClient, authUserId)
      toast({
        title: 'Employee added successfully',
        description: `${newEmployee.name} has been added to your business.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to add employee',
        description:
          error instanceof Error ? error.message : 'Failed to add employee',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateEmployee(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      updates 
    }: { 
      employeeId: string
      updates: UpdateEmployeeRequest
    }) => {
      const result = await employeeService.updateEmployee(employeeId, updates)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update employee')
      }
      return result.data
    },
    onSuccess: (updatedEmployee) => {
      invalidateEmployees(queryClient, authUserId)
      toast({
        title: 'Employee updated successfully',
        description: `${updatedEmployee.name}'s information has been updated.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update employee',
        description:
          error instanceof Error ? error.message : 'Failed to update employee',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteEmployee(authUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      employeeName,
    }: {
      employeeId: string
      employeeName: string
    }) => {
      const result = await employeeService.deleteEmployee(employeeId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete employee')
      }
      return employeeName
    },
    onSuccess: (employeeName) => {
      invalidateEmployees(queryClient, authUserId)
      toast({
        title: 'Employee deleted successfully',
        description: `${employeeName} has been removed from your business.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete employee',
        description:
          error instanceof Error ? error.message : 'Failed to delete employee',
        variant: 'destructive',
      })
    },
  })
}

export function useExportEmployees(authUserId?: string) {
  return useMutation({
    mutationFn: async (params?: { search?: string; status?: string }) => {
      const result = await employeeService.exportEmployeesToCSV(params)
      if (!result.success) {
        throw new Error(result.error || 'Failed to export employees')
      }
      return result.data
    },
    onSuccess: (csvContent) => {
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: 'Employees exported successfully',
        description: 'CSV file has been downloaded to your device.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to export employees',
        description:
          error instanceof Error ? error.message : 'Failed to export employees',
        variant: 'destructive',
      })
    },
  })
}

export function useImportEmployees(authUserId?: string, options?: {
  onSuccess?: (result: { imported: number; errors?: string[] }) => void;
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (csvContent: string) => {
      const result = await employeeService.importEmployeesFromCSV(csvContent)
      if (!result.success) {
        throw new Error(result.error || 'Failed to import employees')
      }
      return result
    },
    onSuccess: (result) => {
      invalidateEmployees(queryClient, authUserId)
      
      // Ensure we have the required data for the callback
      const successData = {
        imported: result.imported || 0,
        errors: result.errors
      }
      
      // Call custom success handler if provided
      if (options?.onSuccess) {
        options.onSuccess(successData)
      } else {
        // Default behavior
        if (result.errors && result.errors.length > 0) {
          toast({
            title: 'Import completed with issues',
            description: `${result.imported} employees imported, ${result.errors.length} errors found.`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Employees imported successfully',
            description: `${result.imported} employees have been imported.`,
          })
        }
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to import employees',
        description:
          error instanceof Error ? error.message : 'Failed to import employees',
        variant: 'destructive',
      })
    },
  })
}
