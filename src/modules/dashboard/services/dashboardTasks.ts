/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
import { NotificationTriggers } from '@/modules/notifications/utils/notificationTriggers'

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

  async getTasks(params?: { pageIndex?: number; pageSize?: number; priority?: string; status?: string; search?: string; organizationId?: string }): Promise<{ tasks: Task[]; total: number }> {
    try {
      const pageIndex = params?.pageIndex ?? 0;
      const pageSize = params?.pageSize ?? 50;
      const priority = params?.priority;
      const status = params?.status;
      const search = params?.search?.trim();

      // Set organization context for PRO users if organizationId is provided and valid
      if (params?.organizationId && params.organizationId.trim() !== '') {
        await supabase.rpc('set_organization_context_text', { org_id: params.organizationId });
      }

      let query = supabase
        .from('compliance_tasks')
        .select('*', { count: 'exact' });

      // Filter by organization if provided (this is now handled by RLS policy)
      // but we keep it for non-PRO users and as a fallback
      if (params?.organizationId) {
        query = query.eq('company_id', params.organizationId);
      }

      // Apply filters
      if (priority && priority !== 'all') {
        query = query.eq('priority', priority);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.ilike('type', `%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false }) // Latest first
        .order('due_date', { ascending: true }) // Then by due date
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);


      if (error) {
        console.error('Error fetching tasks:', error)
        throw error
      }

      // Check for notification triggers
      if (data && data.length > 0) {
        // Get company_id from first task for notification context
        const companyId = data[0]?.company_id;
        if (companyId) {
          NotificationTriggers.checkComplianceTasks(data, companyId).catch(console.error);
        }
      }

      return {
        tasks: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    } finally {
      // Always clear organization context to prevent bleeding between queries
      if (params?.organizationId && params.organizationId.trim() !== '') {
        try {
          await supabase.rpc('clear_organization_context');
        } catch (clearError) {
          console.warn('Failed to clear organization context:', clearError);
        }
      }
    }
  }

  async createTask(taskData: CreateTaskData, companyId?: string): Promise<Task> {
    let userCompanyId: string | undefined = undefined;
    
    try {
      userCompanyId = companyId;

      // Set organization context if companyId is provided and valid
      if (userCompanyId && userCompanyId.trim() !== '') {
        await supabase.rpc('set_organization_context_text', { org_id: userCompanyId });
      }

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
    } finally {
      // Always clear organization context
      if (userCompanyId && userCompanyId.trim() !== '') {
        try {
          await supabase.rpc('clear_organization_context');
        } catch (clearError) {
          console.warn('Failed to clear organization context:', clearError);
        }
      }
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
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return tasks
      .filter(task => {
        const dueDate = new Date(task.due_date)
        return task.status === 'overdue' || 
               (task.status === 'pending' && dueDate <= thirtyDaysFromNow)
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
