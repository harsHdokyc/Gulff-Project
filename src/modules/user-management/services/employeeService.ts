import { supabase } from '@/lib/supabase';

export interface Employee {
  id: string;
  company_id: string;
  name: string;
  visa_expiry: string | null;
  emirates_id_expiry: string | null;
  status: 'active' | 'warning' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  name: string;
  visa_expiry: string;
  emirates_id_expiry: string;
}

export interface UpdateEmployeeRequest {
  name: string;
  visa_expiry: string;
  emirates_id_expiry: string;
}

export interface GetEmployeesPageParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface GetEmployeesPageResult {
  employees: Employee[];
  total: number;
}

export class EmployeeService {
  private static instance: EmployeeService;

  static getInstance(): EmployeeService {
    if (!EmployeeService.instance) {
      EmployeeService.instance = new EmployeeService();
    }
    return EmployeeService.instance;
  }

  // Get current user's company ID
  private async getCurrentCompanyId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      return data?.company_id || null;
    } catch {
      return null;
    }
  }

  // Check if current user is owner or pro (both can manage employees)
  private async canManageEmployees(): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      return data?.role === 'owner' || data?.role === 'pro';
    } catch {
      return false;
    }
  }

  // Get current user ID
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  // Compute status based on expiry dates
  private computeEmployeeStatus(visaExpiry: string | null, emiratesIdExpiry: string | null): 'active' | 'warning' | 'expired' {
    if (!visaExpiry || !emiratesIdExpiry) return 'active';
    
    const now = new Date();
    const visa = new Date(visaExpiry);
    const eid = new Date(emiratesIdExpiry);
    const earliest = visa < eid ? visa : eid;
    
    if (earliest < now) return "expired";
    const diffDays = (earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 30) return "warning";
    return "active";
  }

  // Get paginated employees for current company
  async getEmployeesPage(params: GetEmployeesPageParams): Promise<{ success: boolean; data?: GetEmployeesPageResult; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can view employees' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      const { page, pageSize, search, status } = params;
      const safeSize = Math.min(Math.max(pageSize, 1), 100);
      const from = Math.max(page, 0) * safeSize;
      const to = from + safeSize - 1;

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply search filter
      if (search?.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { 
        success: true, 
        data: {
          employees: data || [],
          total: count || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get all employees for current company (legacy method for backward compatibility)
  async getEmployees(params?: { search?: string; status?: string }): Promise<{ success: boolean; data?: Employee[]; total?: number; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can view employees' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      const search = params?.search?.trim() || '';
      const status = params?.status;

      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply search filter
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { 
        success: true, 
        data: data || [], 
        total: count || 0 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create employee
  async createEmployee(request: CreateEmployeeRequest): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can create employees' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      const status = this.computeEmployeeStatus(request.visa_expiry, request.emirates_id_expiry);

      const { data, error } = await supabase
        .from('employees')
        .insert({
          company_id: companyId,
          name: request.name.trim(),
          visa_expiry: request.visa_expiry,
          emirates_id_expiry: request.emirates_id_expiry,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update employee
  async updateEmployee(employeeId: string, updates: UpdateEmployeeRequest): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can update employees' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      // Verify employee belongs to current company
      const { data: employeeCheck } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (!employeeCheck) {
        return { success: false, error: 'Employee not found or access denied' };
      }

      const status = this.computeEmployeeStatus(updates.visa_expiry, updates.emirates_id_expiry);

      const { data, error } = await supabase
        .from('employees')
        .update({
          name: updates.name.trim(),
          visa_expiry: updates.visa_expiry,
          emirates_id_expiry: updates.emirates_id_expiry,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete employee
  async deleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can delete employees' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      // Verify employee belongs to current company
      const { data: employeeCheck } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (!employeeCheck) {
        return { success: false, error: 'Employee not found or access denied' };
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Export employees to CSV
  async exportEmployeesToCSV(params?: { search?: string; status?: string }): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can export employees' };
      }

      const result = await this.getEmployees(params);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const employees = result.data || [];
      
      // Create CSV content
      const headers = ['name', 'visa_expiry', 'emirates_id_expiry'];
      const csvContent = [
        headers.join(','),
        ...employees.map(emp => [
          `"${emp.name}"`,
          `"${emp.visa_expiry || ''}"`,
          `"${emp.emirates_id_expiry || ''}"`
        ].join(','))
      ].join('\n');

      return { success: true, data: csvContent };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Import employees from CSV
  async importEmployeesFromCSV(csvContent: string): Promise<{ success: boolean; imported?: number; errors?: string[]; error?: string }> {
    try {
      const canManage = await this.canManageEmployees();
      if (!canManage) {
        return { success: false, error: 'Access denied: Only owners and pros can import employees' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      // Parse CSV
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return { success: false, error: 'CSV must contain at least a header row and one data row' };
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const requiredHeaders = ['name', 'visa_expiry', 'emirates_id_expiry'];
      
      // Validate headers
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return { success: false, error: `Missing required columns: ${missingHeaders.join(', ')}` };
      }

      const employees: CreateEmployeeRequest[] = [];
      const errors: string[] = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          const name = values[headers.indexOf('name')] || '';
          const visa_expiry = values[headers.indexOf('visa_expiry')] || '';
          const emirates_id_expiry = values[headers.indexOf('emirates_id_expiry')] || '';
          
          // Validate required fields
          if (!name) {
            errors.push(`Row ${i + 1}: Employee name is required`);
            continue;
          }
          
          if (!visa_expiry) {
            errors.push(`Row ${i + 1}: Visa expiry date is required`);
            continue;
          }
          
          if (!emirates_id_expiry) {
            errors.push(`Row ${i + 1}: Emirates ID expiry date is required`);
            continue;
          }
          
          // Validate date format
          const visaDate = new Date(visa_expiry);
          const eidDate = new Date(emirates_id_expiry);
          
          if (isNaN(visaDate.getTime()) || isNaN(eidDate.getTime())) {
            errors.push(`Row ${i + 1}: Invalid date format. Use YYYY-MM-DD format`);
            continue;
          }
          
          employees.push({
            name: name.trim(),
            visa_expiry,
            emirates_id_expiry
          });
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }
      
      if (employees.length === 0) {
        return { success: false, error: 'No valid employees found in CSV', errors };
      }
      
      // Insert employees in batch
      const { error } = await supabase
        .from('employees')
        .insert(employees.map(emp => ({
          company_id: companyId,
          ...emp,
          status: this.computeEmployeeStatus(emp.visa_expiry, emp.emirates_id_expiry)
        })));

      if (error) throw error;
      
      return { 
        success: true, 
        imported: employees.length,
        errors: errors.length > 0 ? errors : undefined 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const employeeService = EmployeeService.getInstance();
