import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskService, Task, CreateTaskData, UpdateTaskData, TaskStats, TaskAlert } from '@/modules/dashboard/services/dashboardTasks'
import { toast } from '@/hooks/use-toast'
import { useEffect } from 'react'
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization'

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (organizationId?: string) => [...taskKeys.lists(), { organizationId }] as const,
  stats: (organizationId?: string) => [...taskKeys.all, 'stats', { organizationId }] as const,
  alerts: (organizationId?: string) => [...taskKeys.all, 'alerts', { organizationId }] as const,
}

export function useTasks(params?: { pageIndex?: number; pageSize?: number; priority?: string; status?: string; search?: string }) {
  const queryClient = useQueryClient()
  const { organizationId } = useCurrentOrganization()

  // Include organization ID in query parameters
  const queryParams = {
    ...params,
    organizationId: organizationId || undefined,
  }


  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: taskKeys.list(organizationId || undefined),
    queryFn: () => taskService.getTasks(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  })

  useEffect(() => {
    const subscription = taskService.subscribeToTasks((payload) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(organizationId || undefined) })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient, organizationId])

  const tasks = tasksData?.tasks ?? []


  return {
    tasks,
    isLoading,
    error,
    refetch,
    isFetching
  }
}

export function useTaskStats() {
  const { tasks } = useTasks()
  const { organizationId } = useCurrentOrganization()

  return useQuery({
    queryKey: taskKeys.stats(organizationId || undefined),
    queryFn: () => taskService.getTaskStats(tasks),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!tasks.length,
  })
}

export function useTaskAlerts() {
  const { tasks } = useTasks()
  const { organizationId } = useCurrentOrganization()

  return useQuery({
    queryKey: taskKeys.alerts(organizationId || undefined),
    queryFn: () => taskService.getTaskAlerts(tasks),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!tasks.length,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { organizationId } = useCurrentOrganization()

  return useMutation({
    mutationFn: (taskData: CreateTaskData) => taskService.createTask(taskData),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(organizationId || undefined) })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(organizationId || undefined) })
      queryClient.invalidateQueries({ queryKey: taskKeys.alerts(organizationId || undefined) })
      
      toast({
        title: "Task created",
        description: `"${newTask.type}" has been added to your tasks.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Error creating task",
        description: error instanceof Error ? error.message : "Failed to create task",
        variant: "destructive",
      })
    },
  })
}


export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { organizationId } = useCurrentOrganization()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTaskData }) => 
      taskService.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(organizationId || undefined) })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(organizationId || undefined) })
      queryClient.invalidateQueries({ queryKey: taskKeys.alerts(organizationId || undefined) })
      
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error updating task",
        description: error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { organizationId } = useCurrentOrganization()

  return useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(organizationId || undefined) })
      queryClient.invalidateQueries({ queryKey: taskKeys.stats(organizationId || undefined) })
      queryClient.invalidateQueries({ queryKey: taskKeys.alerts(organizationId || undefined) })
      
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error deleting task",
        description: error instanceof Error ? error.message : "Failed to delete task",
        variant: "destructive",
      })
    },
  })
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient()
  const updateTask = useUpdateTask()

  const toggleStatus = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    updateTask.mutate({
      id: task.id,
      updates: { status: newStatus }
    })
  }

  return {
    toggleStatus,
    isLoading: updateTask.isPending
  }
}
