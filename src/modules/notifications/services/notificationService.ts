import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  channel: 'in-app' | 'email' | 'whatsapp';
  urgency_level: number;
  task_id?: string;
  document_id?: string;
  employee_id?: string;
  email_sent: boolean;
  whatsapp_sent: boolean;
  processed_at?: string;
  created_at: string;
}

export interface CreateNotificationData {
  user_id: string;
  company_id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  channel: 'in-app' | 'email' | 'whatsapp';
  urgency_level: number;
  task_id?: string;
  document_id?: string;
  employee_id?: string;
}

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create notification (triggers Edge Function automatically)
  async createNotification(data: CreateNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          company_id: data.company_id,
          message: data.message,
          type: data.type,
          channel: data.channel,
          urgency_level: data.urgency_level,
          task_id: data.task_id,
          document_id: data.document_id,
          employee_id: data.employee_id,
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods for creating expiry notifications
  async createComplianceNotification(userId: string, companyId: string, taskId: string, taskType: string, daysUntilExpiry: number): Promise<{ success: boolean; error?: string }> {
    const urgencyLevel = this.calculateUrgencyLevel(daysUntilExpiry);
    const type = this.getTypeFromUrgency(daysUntilExpiry);
    const message = this.generateComplianceMessage(taskType, daysUntilExpiry);
    
    return this.createNotification({
      user_id: userId,
      company_id: companyId,
      message,
      type,
      channel: 'email',
      urgency_level: urgencyLevel,
      task_id: taskId,
    });
  }

  async createDocumentNotification(userId: string, companyId: string, documentId: string, documentName: string, daysUntilExpiry: number): Promise<{ success: boolean; error?: string }> {
    const urgencyLevel = this.calculateUrgencyLevel(daysUntilExpiry);
    const type = this.getTypeFromUrgency(daysUntilExpiry);
    const message = this.generateDocumentMessage(documentName, daysUntilExpiry);
    
    console.log('📝 CREATING DOCUMENT NOTIFICATION:', {
      userId,
      companyId,
      documentId,
      documentName,
      daysUntilExpiry,
      urgencyLevel,
      type,
      messageLength: message.length
    });
    
    const result = await this.createNotification({
      user_id: userId,
      company_id: companyId,
      message,
      type,
      channel: 'email',
      urgency_level: urgencyLevel,
      document_id: documentId,
    });
    
    if (result.success) {
      console.log('✅ DOCUMENT NOTIFICATION CREATED SUCCESSFULLY');
    } else {
      console.error('❌ DOCUMENT NOTIFICATION CREATION FAILED:', result.error);
    }
    
    return result;
  }

  async createEmployeeNotification(userId: string, companyId: string, employeeId: string, employeeName: string, visaDays: number, emiratesIdDays: number): Promise<{ success: boolean; error?: string }> {
    const minDays = Math.min(visaDays, emiratesIdDays);
    const urgencyLevel = this.calculateUrgencyLevel(minDays);
    const type = this.getTypeFromUrgency(minDays);
    const message = this.generateEmployeeMessage(employeeName, visaDays, emiratesIdDays);
    
    return this.createNotification({
      user_id: userId,
      company_id: companyId,
      message,
      type,
      channel: 'email',
      urgency_level: urgencyLevel,
      employee_id: employeeId,
    });
  }

  private calculateUrgencyLevel(daysUntilExpiry: number): number {
    if (daysUntilExpiry <= 7) return 3; // critical
    if (daysUntilExpiry <= 15) return 2; // danger
    return 1; // warning
  }

  private getTypeFromUrgency(daysUntilExpiry: number): 'info' | 'warning' | 'danger' {
    if (daysUntilExpiry <= 7) return 'danger';
    if (daysUntilExpiry <= 15) return 'warning';
    return 'info';
  }

  private generateComplianceMessage(taskType: string, daysUntilExpiry: number): string {
    return `Why you're receiving this:
You're assigned to the compliance task "${taskType}" which requires attention.

Purpose:
This task ensures your business maintains proper compliance and avoids violations.

Action Required:
Please complete this task immediately.

Deadline: ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days remaining` : 'Overdue'}

Consequences of inaction:
- Business compliance violations
- Financial penalties
- Legal issues`;
  }

  private generateDocumentMessage(documentName: string, daysUntilExpiry: number): string {
    const urgency = this.getUrgencyLabel(daysUntilExpiry);
    const actionLevel = this.getActionLevel(daysUntilExpiry);
    
    return `Why you're receiving this:
Your document "${documentName}" ${urgency} and requires attention.

Purpose:
Valid documentation is required for business operations and compliance.

Action Required:
${actionLevel}

Deadline: ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days remaining` : 'Expired today'}

Consequences of inaction:
${this.getConsequences(daysUntilExpiry)}`;
  }

  private getUrgencyLabel(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 0) return 'has expired';
    if (daysUntilExpiry === 1) return 'expires tomorrow';
    if (daysUntilExpiry <= 7) return 'expires this week';
    if (daysUntilExpiry <= 15) return 'expires soon';
    return 'is approaching expiry';
  }

  private getActionLevel(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 0) return 'URGENT: Upload the renewed document immediately to avoid business disruptions.';
    if (daysUntilExpiry === 1) return 'CRITICAL: Renew and upload the document today - expiry is imminent.';
    if (daysUntilExpiry <= 7) return 'HIGH PRIORITY: Initiate renewal process and upload updated document.';
    if (daysUntilExpiry <= 15) return 'IMPORTANT: Begin renewal process to ensure timely completion.';
    return 'Plan ahead: Start gathering renewal requirements to avoid last-minute issues.';
  }

  private getConsequences(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 0) return '- Immediate business operation disruptions\n- Regulatory non-compliance penalties\n- Service interruptions and potential fines';
    if (daysUntilExpiry === 1) return '- Business suspension tomorrow\n- Financial penalties and legal issues\n- Loss of operational licenses';
    if (daysUntilExpiry <= 7) return '- Business operation disruptions within week\n- Regulatory compliance violations\n- Potential service interruptions';
    if (daysUntilExpiry <= 15) return '- Risk of business disruptions\n- Compliance violations possible\n- Service interruptions likely';
    return '- Future business operation risks\n- Planning ahead prevents issues\n- Avoid last-minute renewal problems';
  }

  private generateEmployeeMessage(employeeName: string, visaDays: number, emiratesIdDays: number): string {
    const minDays = Math.min(visaDays, emiratesIdDays);
    const expiringDoc = visaDays === minDays ? 'Visa' : 'Emirates ID';
    
    return `Why you're receiving this:
Employee ${employeeName}'s ${expiringDoc} is expiring and requires renewal.

Purpose:
Valid employee documents are mandatory for legal employment status.

Action Required:
Submit renewal application immediately.

Deadline: ${minDays > 0 ? `${minDays} days remaining` : 'Expired'}

Consequences of inaction:
- Employee work authorization loss
- Legal employment violations
- Potential deportation proceedings`;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
