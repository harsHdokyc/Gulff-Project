import { supabase } from '@/lib/supabase';

// Types
export interface User {
  id: string;
  email: string;
  role: 'owner' | 'pro' | 'employee';
  full_name: string | null;
  created_at: string;
  company_id: string;
}

export interface CreateUserData {
  email: string;
  role: 'pro' | 'employee';
  full_name: string;
  /** Initial password chosen by the business owner (never returned from APIs). */
  password: string;
}

/** Shared with UI validation for owner-created accounts */
export const CREATE_USER_PASSWORD_MIN_LENGTH = 8;
export const CREATE_USER_PASSWORD_MAX_LENGTH = 72;

export interface UserCredentials {
  email: string;
  temporaryPassword: string;
}

// User Management Service
export class UserManagementService {
  private static instance: UserManagementService;

  static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
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
    } catch (error) {
      console.error('Error getting company ID:', error);
      return null;
    }
  }

  // Get current user ID
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  // Check if current user is owner
  private async isCurrentUserOwner(): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      return data?.role === 'owner';
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  private validateNewAccountPassword(password: string): string | null {
    if (!password || password.length < CREATE_USER_PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${CREATE_USER_PASSWORD_MIN_LENGTH} characters`;
    }
    if (password.length > CREATE_USER_PASSWORD_MAX_LENGTH) {
      return `Password must be at most ${CREATE_USER_PASSWORD_MAX_LENGTH} characters`;
    }
    return null;
  }

  // Get all users for current company
  async getUsers(params?: { pageIndex?: number; pageSize?: number; search?: string; role?: string }): Promise<{ success: boolean; data?: User[]; total?: number; error?: string }> {
    try {
      // Security check: only owners can view all users
      const isOwner = await this.isCurrentUserOwner();
      if (!isOwner) {
        return { success: false, error: 'Access denied: Only owners can view users' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      const pageIndex = params?.pageIndex ?? 0;
      const pageSize = params?.pageSize ?? 10;
      const search = params?.search?.trim() || '';
      const role = params?.role;

      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          full_name,
          created_at,
          company_id
        `, { count: 'exact' })
        .eq('company_id', companyId);

      // Apply role filter
      if (role && role !== 'all') {
        query = query.eq('role', role);
      }

      // Apply search filter
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply pagination and ordering
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

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

  /**
   * Creates auth + public profile via Edge Function (service role).
   * Browser cannot call auth.admin APIs (401 with anon key).
   */
  async createUser(userData: CreateUserData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!userData.email.trim() || !userData.full_name.trim()) {
        return { success: false, error: 'Email and full name are required' };
      }

      const passwordError = this.validateNewAccountPassword(userData.password);
      if (passwordError) {
        return { success: false, error: passwordError };
      }

      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('company-user-admin', {
        body: {
          action: 'create',
          email: userData.email.trim(),
          password: userData.password,
          full_name: userData.full_name.trim(),
          role: userData.role,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to create user',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Failed to create user',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
  }

  // Update user
  async updateUser(userId: string, updates: Partial<Pick<User, 'full_name'>>): Promise<{ success: boolean; error?: string }> {
    try {
      // Security check: only owners can update users
      const isOwner = await this.isCurrentUserOwner();
      if (!isOwner) {
        return { success: false, error: 'Access denied: Only owners can update users' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      // Verify user belongs to current company
      const { data: userCheck } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('company_id', companyId)
        .single();

      if (!userCheck) {
        return { success: false, error: 'User not found or access denied' };
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /** Deletes user via Edge Function (service role auth.admin). */
  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('company-user-admin', {
        body: { action: 'delete', user_id: userId },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to delete user',
        };
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Failed to delete user',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      };
    }
  }
}

// Export singleton instance
export const userManagementService = UserManagementService.getInstance();
