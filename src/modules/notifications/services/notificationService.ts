import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  channel: 'in-app' | 'email' | 'whatsapp';
  read: boolean;
  created_at: string;
  sent_at: string | null;
}

export interface CreateNotificationData {
  user_id: string;
  company_id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  channel?: 'in-app' | 'email' | 'whatsapp';
}

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create notification
  async createNotification(data: CreateNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          company_id: data.company_id,
          message: data.message,
          type: data.type,
          channel: data.channel || 'in-app',
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get user notifications
  async getUserNotifications(userId: string): Promise<{ success: boolean; data?: Notification[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      return { success: true, count: count || 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
