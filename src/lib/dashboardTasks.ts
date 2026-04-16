/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase'

export interface Task {
  id: string
  type: string
  due_date: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateTaskData {
  type: string
  due_date: string
  priority: 'low' | 'medium' | 'high'
  notes?: string
}

export interface UpdateTaskData {
  type?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'pending' | 'completed' | 'overdue'
  notes?: string
}

export interface TaskStats {
  total: number
  pending: number
  completed: number
  overdue: number
}

export interface TaskAlert {
  id: string
  message: string
  type: 'danger' | 'warning'
  task_id: string
  task_type: string
  due_date: string
}

class TaskService {
  private static instance: TaskService

  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService()
    }
    return TaskService.instance
  }

  async getTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('compliance_tasks')
        .select('*')
        .order('created_at', { ascending: false }) // Latest first
        .order('due_date', { ascending: true }) // Then by due date

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }
  }

  async createTask(taskData: CreateTaskData, companyId?: string): Promise<Task> {
    try {
      let userCompanyId = companyId;

      // Fetch company_id if not provided
      if (!userCompanyId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('User not authenticated')
        }

        const { data: rpcCompanyId, error: rpcError } = await supabase
          .rpc('get_user_company')

        if (rpcError || !rpcCompanyId) {
          throw new Error('User company not found')
        }
        userCompanyId = rpcCompanyId
      }

      const { data, error } = await supabase
        .from('compliance_tasks')
        .insert([{
          ...taskData,
          company_id: userCompanyId,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('compliance_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('compliance_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  getTaskStats(tasks: Task[]): TaskStats {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status === 'overdue').length
    }
  }

  getTaskAlerts(tasks: Task[]): TaskAlert[] {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return tasks
      .filter(task => {
        const dueDate = new Date(task.due_date)
        return task.status === 'overdue' || 
               (task.status === 'pending' && dueDate <= sevenDaysFromNow)
      })
      .map(task => ({
        id: task.id,
        message: task.status === 'overdue' 
          ? `${task.type} is overdue` 
          : `${task.type} expiring soon`,
        type: task.status === 'overdue' ? 'danger' as const : 'warning' as const,
        task_id: task.id,
        task_type: task.type,
        due_date: task.due_date
      }))
  }

  subscribeToTasks(callback: (payload: any) => void) {
    // Unique topic per subscriber: `supabase.channel('same')` reuses one Realtime
    // channel; postgres_changes listeners cannot be added after subscribe().
    // Multiple hooks call useTasks() (e.g. useTaskStats / useTaskAlerts), so each
    // subscription needs its own channel name while listening to the same table.
    const topic = `compliance_tasks:${crypto.randomUUID()}`
    return supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compliance_tasks'
        },
        callback
      )
      .subscribe()
  }
}

export const taskService = TaskService.getInstance()
