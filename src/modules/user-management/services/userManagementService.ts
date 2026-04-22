/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/modules/notifications/services/notificationService';

// Types
export interface User {
  id: string;
  email: string;
  role: 'owner' | 'pro';
  full_name: string | null;
  created_at: string;
  company_id: string;
}

export interface CreateUserData {
  email: string;
  role: 'pro';
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

// PRO Association Types
export interface ProSearchResult {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface ProBusinessRequest {
  id: string;
  business_id: string;
  pro_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  updated_at: string;
  // Join data
  business_name?: string;
  pro_name?: string;
  pro_email?: string;
}

export interface CreateProAssociationRequest {
  pro_user_id: string;
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
    } catch {
      return null;
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
    } catch {
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

  // Search for PRO users across all companies (for association requests)
  async searchPros(query: string): Promise<{ success: boolean; data?: ProSearchResult[]; error?: string }> {
    try {
      const isOwner = await this.isCurrentUserOwner();
      if (!isOwner) {
        return { success: false, error: 'Access denied: Only owners can search for PROs' };
      }

      if (!query || query.trim().length < 2) {
        return { success: false, error: 'Search query must be at least 2 characters' };
      }

      const searchTerm = query.trim();

      const { data, error } = await supabase.rpc('search_pro_users_for_association', {
        search_term: searchTerm,
        limit_count: 10,
      });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
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

  // Create PRO association request
  async createProAssociationRequest(request: CreateProAssociationRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const isOwner = await this.isCurrentUserOwner();
      if (!isOwner) {
        return { success: false, error: 'Access denied: Only owners can create association requests' };
      }

      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      const { data: canAssociate, error: canAssociateError } = await supabase.rpc(
        'can_associate_with_pro',
        { target_pro_user_id: request.pro_user_id }
      );
      if (canAssociateError) throw canAssociateError;

      if (!canAssociate) {
        return { success: false, error: 'PRO not found' };
      }

      // Check if request already exists
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('pro_business_requests')
        .select('id, status')
        .eq('business_id', companyId)
        .eq('pro_user_id', request.pro_user_id)
        .in('status', ['pending', 'accepted'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRequestError) throw existingRequestError;

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return { success: false, error: 'Association request already sent and is pending' };
        }
        if (existingRequest.status === 'accepted') {
          return { success: false, error: 'PRO is already associated with your business' };
        }
      }

      const { error } = await supabase
        .from('pro_business_requests')
        .insert({
          business_id: companyId,
          pro_user_id: request.pro_user_id,
        });

      if (error) throw error;

      // Get business name for notification
      const { data: businessData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      const businessName = businessData?.name || 'A business';

      // Send notification to PRO
      const notificationResult = await notificationService.createNotification({
        user_id: request.pro_user_id,
        company_id: companyId,
        message: `${businessName} wants to associate with you`,
        type: 'info',
        channel: 'in-app',
      });

      void notificationResult

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get association requests for current business
  async getBusinessAssociationRequests(): Promise<{ success: boolean; data?: ProBusinessRequest[]; error?: string }> {
    try {
      const companyId = await this.getCurrentCompanyId();
      if (!companyId) {
        return { success: false, error: 'Company not found' };
      }

      const { data, error } = await supabase
        .from('pro_business_requests')
        .select(`
          id,
          business_id,
          pro_user_id,
          status,
          message,
          created_at,
          updated_at,
          companies!inner(name),
          users!inner(email, full_name)
        `)
        .eq('business_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requests = (data || []).map((item: any) => ({
        id: item.id,
        business_id: item.business_id,
        pro_user_id: item.pro_user_id,
        status: item.status,
        message: item.message,
        created_at: item.created_at,
        updated_at: item.updated_at,
        business_name: item.companies?.name,
        pro_name: item.users?.full_name,
        pro_email: item.users?.email,
      }));

      return { success: true, data: requests };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get association requests sent to current PRO user
  async getProAssociationRequests(): Promise<{ success: boolean; data?: ProBusinessRequest[]; error?: string }> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('pro_business_requests')
        .select(`
          id,
          business_id,
          pro_user_id,
          status,
          message,
          created_at,
          updated_at,
          companies(name)
        `)
        .eq('pro_user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requests = (data || []).map((item: any) => ({
        id: item.id,
        business_id: item.business_id,
        pro_user_id: item.pro_user_id,
        status: item.status,
        message: item.message,
        created_at: item.created_at,
        updated_at: item.updated_at,
        business_name: item.companies?.name,
      }));

      return { success: true, data: requests };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update association request status (for PROs to accept/reject)
  async updateAssociationRequest(requestId: string, status: 'accepted' | 'rejected'): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('pro_business_requests')
        .select('business_id, pro_user_id, status')
        .eq('id', requestId)
        .eq('pro_user_id', currentUserId)
        .single();

      if (fetchError || !request) {
        return { success: false, error: 'Request not found or access denied' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Request has already been processed' };
      }

      // Update the request status
      const { error: updateError } = await supabase
        .from('pro_business_requests')
        .update({ status })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Get business owner info for notification
      const { data: businessOwnerData, error: businessOwnerError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('company_id', request.business_id)
        .eq('role', 'owner')
        .maybeSingle();

      void businessOwnerError

      // Get PRO info for notification
      const { data: proData, error: proDataError } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', currentUserId)
        .maybeSingle();

      void proDataError

      const proName = proData?.full_name || 'A PRO';

      // If accepted, establish the association
      if (status === 'accepted') {
        const { error: associationError } = await supabase
          .from('users')
          .update({ pro_id: currentUserId })
          .eq('company_id', request.business_id)
          .eq('role', 'owner');

        if (associationError) throw associationError;

        // Notify business owner of acceptance
        if (businessOwnerData) {
          const notificationResult = await notificationService.createNotification({
            user_id: businessOwnerData.id,
            company_id: request.business_id,
            message: `${proName} has accepted your association request`,
            type: 'info',
            channel: 'in-app',
          });
          void notificationResult
        }
      } else {
        // Notify business owner of rejection
        if (businessOwnerData) {
          const notificationResult = await notificationService.createNotification({
            user_id: businessOwnerData.id,
            company_id: request.business_id,
            message: `${proName} has declined your association request`,
            type: 'warning',
            channel: 'in-app',
          });
          void notificationResult
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const userManagementService = UserManagementService.getInstance();
