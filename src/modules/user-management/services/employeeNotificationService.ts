import { supabase } from '@/lib/supabase';
import { NotificationTriggers } from '@/modules/notifications/utils/notificationTriggers';

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  visa_expiry?: string;
  emirates_id_expiry?: string;
  status: string;
}

export interface GetEmployeesPageParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  organizationId?: string;
}

export interface GetEmployeesPageResult {
  employees: Employee[];
  total: number;
}

class EmployeeNotificationService {
  private static instance: EmployeeNotificationService;

  static getInstance(): EmployeeNotificationService {
    if (!EmployeeNotificationService.instance) {
      EmployeeNotificationService.instance = new EmployeeNotificationService();
    }
    return EmployeeNotificationService.instance;
  }

  async getEmployeesPage(params: GetEmployeesPageParams): Promise<GetEmployeesPageResult> {
    const { page, pageSize, search, status, organizationId } = params;
    const safeSize = Math.min(Math.max(pageSize, 1), 100);
    const from = Math.max(page, 0) * safeSize;
    const to = from + safeSize - 1;

    try {
      // Set organization context if provided
      if (organizationId && organizationId.trim() !== '') {
        await supabase.rpc('set_organization_context_text', { org_id: organizationId });
      }

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' });

      if (organizationId) {
        query = query.eq('company_id', organizationId);
      }

      query = query.order('created_at', { ascending: false });

      if (search?.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      // Check for notification triggers
      if (data && data.length > 0) {
        const companyId = data[0]?.company_id;
        if (companyId) {
          NotificationTriggers.checkEmployees(data, companyId).catch(console.error);
        }
      }

      return {
        employees: data || [],
        total: count ?? 0,
      };
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    } finally {
      // Always clear organization context
      if (organizationId && organizationId.trim() !== '') {
        try {
          await supabase.rpc('clear_organization_context');
        } catch (clearError) {
          console.warn('Failed to clear organization context:', clearError);
        }
      }
    }
  }
}

export const employeeNotificationService = EmployeeNotificationService.getInstance();
