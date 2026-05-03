# 📧 Progressive Notification System Documentation

## 🎯 Overview

This document covers the complete implementation of a progressive notification system that sends automated email and WhatsApp reminders for document expiries, compliance tasks, and employee visa/ID expiries at specific milestones (30, 15, 7, 1, and 0 days before expiry).

---

## 🏗️ System Architecture

### Frontend Components
- **Notification Triggers** - Detects expiry milestones
- **Notification Service** - Creates notifications in database
- **Document Service** - Integrates with document management
- **React Components** - Display and manage notifications

### Backend Components  
- **Supabase Database** - Stores notifications and tracking data
- **Edge Functions** - Processes notifications and sends emails/WhatsApp
- **Resend API** - Email delivery service
- **Twilio API** - WhatsApp message delivery

---

## 📊 Database Schema

### Core Tables

#### `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  message TEXT,
  type TEXT CHECK (type IN ('info', 'warning', 'danger')),
  channel TEXT CHECK (channel IN ('in-app', 'email', 'whatsapp')),
  urgency_level INTEGER DEFAULT 1,
  task_id UUID REFERENCES compliance_tasks(id),
  document_id UUID REFERENCES documents(id),
  employee_id UUID REFERENCES employees(id),
  email_sent BOOLEAN DEFAULT false,
  whatsapp_sent BOOLEAN DEFAULT false,
  email_error TEXT,
  whatsapp_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `notification_history`
```sql
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  milestone_days INTEGER NOT NULL,
  notification_id UUID REFERENCES notifications(id),
  company_id UUID REFERENCES companies(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(entity_id, entity_type, milestone_days)
);
```

#### `notification_logs`
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 🔧 Frontend Implementation

### 1. Notification Triggers (`src/modules/notifications/utils/notificationTriggers.ts`)

```typescript
import { notificationService } from '../services/notificationService';
import { supabase } from '@/lib/supabase';

/**
 * Progressive notification triggers for expiry warnings
 * Sends notifications at 30, 15, 7, 1, and 0 days before expiry
 */
export class NotificationTriggers {
  
  /**
   * Progressive notification milestones
   */
  private static readonly PROGRESSIVE_MILESTONES = [30, 15, 7, 1, 0];
  
  /**
   * Check and trigger document notifications
   */
  static async checkDocuments(documents: any[], companyId: string) {
    const now = new Date();
    const notificationsCreated = [];
    
    console.log('🔍 CHECKING DOCUMENT NOTIFICATIONS:', {
      companyId,
      totalDocuments: documents.length,
      checkDate: now.toISOString(),
      milestones: this.PROGRESSIVE_MILESTONES
    });
    
    for (const doc of documents) {
      if (!doc.expiry_date || doc.status === 'complete') {
        console.log(`⏭️  Skipping document ${doc.name} - no expiry or complete`);
        continue;
      }
      
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 Document ${doc.name}: ${daysUntilExpiry} days until expiry`);
      
      // Check if today is a notification milestone
      if (this.PROGRESSIVE_MILESTONES.includes(daysUntilExpiry)) {
        console.log(`🚨 NOTIFICATION TRIGGERED for ${doc.name} (${daysUntilExpiry} days)`);
        
        // Check if this milestone was already sent (prevent duplicates)
        const { data: existingMilestone } = await supabase
          .from('notification_history')
          .select('*')
          .eq('entity_id', doc.id)
          .eq('entity_type', 'document')
          .eq('milestone_days', daysUntilExpiry)
          .eq('company_id', companyId)
          .single();
          
        if (existingMilestone) {
          console.log(`⏭️  Skipping ${doc.name} - milestone ${daysUntilExpiry} already sent`);
          continue;
        }
        
        // Get company owner for notifications
        const { data: owner } = await supabase
          .from('users')
          .select('id, email')
          .eq('company_id', companyId)
          .eq('role', 'owner')
          .single();
          
        if (owner) {
          console.log(`👤 Found owner: ${owner.email} (${owner.id})`);
          
          try {
            const result = await notificationService.createDocumentNotification(
              owner.id,
              companyId,
              doc.id,
              doc.name,
              daysUntilExpiry
            );
            
            if (result.success) {
              // Track this milestone to prevent duplicates
              try {
                const { error: historyError } = await supabase
                  .from('notification_history')
                  .insert({
                    entity_id: doc.id,
                    entity_type: 'document',
                    milestone_days: daysUntilExpiry,
                    company_id: companyId,
                    sent_at: new Date().toISOString()
                  });
                  
                if (historyError) {
                  // Handle duplicate key error gracefully (race condition)
                  if (historyError.code === '23505') {
                    console.log(`✅ Milestone already tracked for ${doc.name} (${daysUntilExpiry} days) - race condition handled`);
                  } else {
                    console.error(`Failed to track milestone for ${doc.name}:`, historyError);
                  }
                } else {
                  console.log(`✅ Milestone tracked for ${doc.name} (${daysUntilExpiry} days)`);
                }
              } catch (error) {
                console.error(`Failed to track milestone for ${doc.name}:`, error);
              }
              
              notificationsCreated.push({
                document: doc.name,
                daysUntilExpiry,
                owner: owner.email,
                status: 'created'
              });
              console.log(`✅ Notification created for ${doc.name}`);
            } else {
              console.error(`❌ Failed to create notification for ${doc.name}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Error creating notification for ${doc.name}:`, error);
          }
        } else {
          console.log(`❌ No owner found for company ${companyId}`);
        }
      } else {
        console.log(`ℹ️  No notification needed for ${doc.name} (${daysUntilExpiry} days)`);
      }
    }
    
    console.log('📊 DOCUMENT NOTIFICATION SUMMARY:', {
      totalChecked: documents.length,
      notificationsCreated: notificationsCreated.length,
      notifications: notificationsCreated
    });
    
    return {
      success: true,
      notificationsCreated: notificationsCreated.length,
      details: notificationsCreated
    };
  }

  /**
   * Check and trigger compliance task notifications
   */
  static async checkComplianceTasks(tasks: any[], companyId: string) {
    const now = new Date();
    
    for (const task of tasks) {
      if (task.status === 'completed') continue;
      
      const dueDate = new Date(task.due_date);
      const daysUntilExpiry = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if today is a notification milestone
      if (this.PROGRESSIVE_MILESTONES.includes(daysUntilExpiry)) {
        // Check if this milestone was already sent (prevent duplicates)
        const { data: existingMilestone } = await supabase
          .from('notification_history')
          .select('*')
          .eq('entity_id', task.id)
          .eq('entity_type', 'task')
          .eq('milestone_days', daysUntilExpiry)
          .eq('company_id', companyId)
          .single();
          
        if (existingMilestone) {
          console.log(`⏭️  Skipping task ${task.type} - milestone ${daysUntilExpiry} already sent`);
          continue;
        }
        
        // Get company owner for notifications
        const { data: owner } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', companyId)
          .eq('role', 'owner')
          .single();
          
        if (owner) {
          const result = await notificationService.createComplianceNotification(
            owner.id,
            companyId,
            task.id,
            task.type,
            daysUntilExpiry
          );
          
          if (result.success) {
            // Track this milestone to prevent duplicates
            try {
              const { error: historyError } = await supabase
                .from('notification_history')
                .insert({
                  entity_id: task.id,
                  entity_type: 'task',
                  milestone_days: daysUntilExpiry,
                  company_id: companyId,
                  sent_at: new Date().toISOString()
                });
                
              if (historyError) {
                // Handle duplicate key error gracefully (race condition)
                if (historyError.code === '23505') {
                  console.log(`✅ Milestone already tracked for task ${task.type} (${daysUntilExpiry} days) - race condition handled`);
                } else {
                  console.error(`Failed to track milestone for task ${task.type}:`, historyError);
                }
              } else {
                console.log(`✅ Milestone tracked for task ${task.type} (${daysUntilExpiry} days)`);
              }
            } catch (error) {
              console.error(`Failed to track milestone for task ${task.type}:`, error);
            }
          }
        }
      }
    }
  }

  /**
   * Check and trigger employee notifications
   */
  static async checkEmployees(employees: any[], companyId: string) {
    const now = new Date();
    
    for (const employee of employees) {
      const visaDays = employee.visa_expiry ? 
        Math.ceil((new Date(employee.visa_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      const emiratesIdDays = employee.emirates_id_expiry ? 
        Math.ceil((new Date(employee.emirates_id_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      
      const minDays = Math.min(visaDays, emiratesIdDays);
      
      // Check if today is a notification milestone
      if (this.PROGRESSIVE_MILESTONES.includes(minDays)) {
        // Check if this milestone was already sent (prevent duplicates)
        const { data: existingMilestone } = await supabase
          .from('notification_history')
          .select('*')
          .eq('entity_id', employee.id)
          .eq('entity_type', 'employee')
          .eq('milestone_days', minDays)
          .eq('company_id', companyId)
          .single();
          
        if (existingMilestone) {
          console.log(`⏭️  Skipping employee ${employee.name} - milestone ${minDays} already sent`);
          continue;
        }
        
        // Get company owner for notifications
        const { data: owner } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', companyId)
          .eq('role', 'owner')
          .single();
          
        if (owner) {
          const result = await notificationService.createEmployeeNotification(
            owner.id,
            companyId,
            employee.id,
            employee.name,
            visaDays,
            emiratesIdDays
          );
          
          if (result.success) {
            // Track this milestone to prevent duplicates
            try {
              const { error: historyError } = await supabase
                .from('notification_history')
                .insert({
                  entity_id: employee.id,
                  entity_type: 'employee',
                  milestone_days: minDays,
                  company_id: companyId,
                  sent_at: new Date().toISOString()
                });
                
              if (historyError) {
                // Handle duplicate key error gracefully (race condition)
                if (historyError.code === '23505') {
                  console.log(`✅ Milestone already tracked for employee ${employee.name} (${minDays} days) - race condition handled`);
                } else {
                  console.error(`Failed to track milestone for employee ${employee.name}:`, historyError);
                }
              } else {
                console.log(`✅ Milestone tracked for employee ${employee.name} (${minDays} days)`);
              }
            } catch (error) {
              console.error(`Failed to track milestone for employee ${employee.name}:`, error);
            }
          }
        }
      }
    }
  }
}
```

### 2. Notification Service (`src/modules/notifications/services/notificationService.ts`)

```typescript
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
```

### 3. Document Service Integration (`src/documentService.ts`)

```typescript
import { NotificationTriggers } from '@/modules/notifications/utils/notificationTriggers';

/**
 * Trigger document notifications
 */
export async function triggerDocumentNotifications(companyId: string) {
  try {
    console.log('🔔 DOCUMENT NOTIFICATION TRIGGER:', { companyId });
    
    // Fetch documents for the company
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      console.error('❌ Error fetching documents:', error);
      return { success: false, error: error.message };
    }
    
    if (!documents || documents.length === 0) {
      console.log('ℹ️  No documents found for company');
      return { success: true, notificationsCreated: 0, details: [] };
    }
    
    // Check and trigger notifications
    const result = await NotificationTriggers.checkDocuments(documents, companyId);
    
    console.log('✅ DOCUMENT NOTIFICATION RESULT:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error in document notification trigger:', error);
    return { success: false, error: error.message };
  }
}
```

---

## 🚀 Backend Implementation

### 1. Supabase Edge Function (`send-notification`)

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
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
  email_sent?: boolean;
  whatsapp_sent?: boolean;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { record }, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('id', req.headers.get('notification-id')!)
      .single();

    if (error || !record) {
      console.error('Error fetching notification:', error);
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const notification = record as NotificationPayload;
    console.log('📧 Processing notification:', notification);

    // Get user details for email/WhatsApp
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('email, phone')
      .eq('id', notification.user_id)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let emailError: string | null = null;
    let whatsappError: string | null = null;

    // Send email if channel includes email
    if (notification.channel === 'email' || notification.channel === 'whatsapp') {
      try {
        const emailResult = await sendEmail(user.email, notification.message, notification.type);
        if (!emailResult.success) {
          emailError = emailResult.error;
        }
      } catch (error) {
        emailError = error.message;
      }
    }

    // Send WhatsApp if channel includes whatsapp
    if (notification.channel === 'whatsapp') {
      try {
        const whatsappResult = await sendWhatsApp(user.phone, notification.message, notification.type);
        if (!whatsappResult.success) {
          whatsappError = whatsappResult.error;
        }
      } catch (error) {
        whatsappError = error.message;
      }
    }

    // Update notification status
    const updateData: any = {
      processed_at: new Date().toISOString(),
    };

    if (emailError === null && (notification.channel === 'email' || notification.channel === 'whatsapp')) {
      updateData.email_sent = true;
    }
    if (emailError) {
      updateData.email_error = emailError;
    }

    if (whatsappError === null && notification.channel === 'whatsapp') {
      updateData.whatsapp_sent = true;
    }
    if (whatsappError) {
      updateData.whatsapp_error = whatsappError;
    }

    const { error: updateError } = await supabaseClient
      .from('notifications')
      .update(updateData)
      .eq('id', notification.id);

    if (updateError) {
      console.error('Error updating notification:', updateError);
    }

    // Log delivery attempts
    await logDeliveryAttempt(supabaseClient, notification.id, 'email', emailError === null ? 'sent' : 'failed', emailError);
    if (notification.channel === 'whatsapp') {
      await logDeliveryAttempt(supabaseClient, notification.id, 'whatsapp', whatsappError === null ? 'sent' : 'failed', whatsappError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        email_sent: emailError === null,
        whatsapp_sent: whatsappError === null,
        email_error: emailError,
        whatsapp_error: whatsappError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendEmail(to: string, message: string, type: string): Promise<{ success: boolean; error?: string }> {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const subject = getEmailSubject(type);
    const html = getEmailHtml(message, type);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@1stopkyc.com',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email API error: ${error}`);
    }

    const data = await response.json();
    console.log('✅ Email sent successfully:', data.id);
    return { success: true };

  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

async function sendWhatsApp(to: string, message: string, type: string): Promise<{ success: boolean; error?: string }> {
  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:${to}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${error}`);
    }

    const data = await response.json();
    console.log('✅ WhatsApp sent successfully:', data.sid);
    return { success: true };

  } catch (error) {
    console.error('❌ WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

function getEmailSubject(type: string): string {
  switch (type) {
    case 'danger':
      return '🚨 URGENT: Compliance Alert - Action Required';
    case 'warning':
      return '⚠️ Compliance Reminder - Attention Needed';
    default:
      return 'ℹ️ Compliance Notification';
  }
}

function getEmailHtml(message: string, type: string): string {
  const bgColor = type === 'danger' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#f0f9ff';
  const borderColor = type === 'danger' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Compliance Notification</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: ${borderColor}; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: ${bgColor}; }
        .message { white-space: pre-line; line-height: 1.6; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Compliance Management System</h1>
        </div>
        <div class="content">
          <div class="message">${message}</div>
        </div>
        <div class="footer">
          <p>This is an automated message from your Compliance Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function logDeliveryAttempt(
  supabaseClient: any,
  notificationId: string,
  channel: string,
  status: string,
  errorMessage?: string
) {
  try {
    await supabaseClient
      .from('notification_logs')
      .insert({
        notification_id: notificationId,
        channel,
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Error logging delivery attempt:', error);
  }
}
```

### 2. Database Setup

#### RLS Policies for `notification_history`

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Service role full access" ON notification_history;

-- Create comprehensive policies for notification_history
CREATE POLICY "Users can view own company notification history" ON notification_history
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u 
      WHERE u.company_id = notification_history.company_id
    )
  );

CREATE POLICY "Users can insert own company notification history" ON notification_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT u.id FROM users u 
      WHERE u.company_id = company_id
    )
  );

CREATE POLICY "Service role full access to notification_history" ON notification_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

#### Database Trigger for Edge Function

```sql
-- Create trigger to call Edge Function when notification is inserted
CREATE OR REPLACE FUNCTION send_notification_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be handled by the webhook trigger in Supabase
  -- The Edge Function will be called via webhook
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_notification_trigger();
```

---

## 🔧 Configuration

### Environment Variables

#### Supabase Edge Function (`.env`)

```bash
# Email Service
RESEND_API_KEY=your_resend_api_key_here

# WhatsApp Service  
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_number

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Webhook Configuration

1. Go to Supabase Dashboard → Database → Webhooks
2. Create new webhook:
   - **Name**: `send-notification-webhook`
   - **Table**: `notifications`
   - **Events**: `INSERT`
   - **URL**: `https://your-project.supabase.co/functions/v1/send-notification`
   - **Secret**: Your webhook secret
   - **Active**: ✅

---

## 📱 Usage Examples

### Frontend Integration

```typescript
// In your document service or component
import { NotificationTriggers } from '@/modules/notifications/utils/notificationTriggers';

// Trigger notifications for documents
const result = await NotificationTriggers.checkDocuments(documents, companyId);

// Trigger notifications for compliance tasks  
const result = await NotificationTriggers.checkComplianceTasks(tasks, companyId);

// Trigger notifications for employees
const result = await NotificationTriggers.checkEmployees(employees, companyId);
```

### React Component Integration

```typescript
import { useEffect } from 'react';
import { NotificationTriggers } from '@/modules/notifications/utils/notificationTriggers';

function DocumentsPage() {
  useEffect(() => {
    // Trigger notifications when documents are loaded
    if (documents.length > 0) {
      NotificationTriggers.checkDocuments(documents, companyId);
    }
  }, [documents, companyId]);

  // ... rest of component
}
```

---

## 📊 Monitoring & Logging

### Notification Logs

```sql
-- Check notification delivery status
SELECT 
  n.id,
  n.message,
  n.type,
  n.channel,
  n.email_sent,
  n.whatsapp_sent,
  n.processed_at,
  nl.channel as log_channel,
  nl.status,
  nl.error_message,
  nl.sent_at as log_sent_at
FROM notifications n
LEFT JOIN notification_logs nl ON n.id = nl.notification_id
ORDER BY n.created_at DESC;
```

### Notification History

```sql
-- Check milestone tracking
SELECT 
  nh.entity_id,
  nh.entity_type,
  nh.milestone_days,
  nh.sent_at,
  d.name as document_name,
  t.type as task_type,
  e.name as employee_name
FROM notification_history nh
LEFT JOIN documents d ON nh.entity_id = d.id AND nh.entity_type = 'document'
LEFT JOIN compliance_tasks t ON nh.entity_id = t.id AND nh.entity_type = 'task'
LEFT JOIN employees e ON nh.entity_id = e.id AND nh.entity_type = 'employee'
ORDER BY nh.sent_at DESC;
```

---

## 🚨 Error Handling

### Common Issues & Solutions

#### 1. RLS Policy Violations
```sql
-- Check if RLS policies are correctly configured
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notification_history';
```

#### 2. Edge Function Timeout
- Increase function timeout in Supabase Dashboard
- Optimize email/WhatsApp sending logic

#### 3. Duplicate Key Errors
- Handled gracefully in the code
- Logs show "race condition handled" message

#### 4. Missing Environment Variables
- Verify all required environment variables are set
- Check Edge Function logs for configuration errors

---

## 🔄 Testing

### Manual Testing

```typescript
// Test notification creation
const testNotification = await notificationService.createDocumentNotification(
  'user-id',
  'company-id', 
  'document-id',
  'Test Document',
  1 // 1 day until expiry
);

console.log('Test result:', testNotification);
```

### Database Testing

```sql
-- Test notification insertion
INSERT INTO notifications (
  user_id,
  company_id,
  message,
  type,
  channel,
  urgency_level,
  document_id
) VALUES (
  'test-user-id',
  'test-company-id',
  'Test notification message',
  'warning',
  'email',
  2,
  'test-document-id'
);

-- Check if Edge Function was triggered
SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 1;
```

---

## 📈 Performance Considerations

### Database Indexes

```sql
-- Recommended indexes for better performance
CREATE INDEX idx_notifications_user_company ON notifications(user_id, company_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notification_history_entity ON notification_history(entity_id, entity_type, milestone_days);
CREATE INDEX idx_notification_logs_notification ON notification_logs(notification_id);
```

### Batch Processing

```typescript
// Process notifications in batches to avoid overwhelming the system
const BATCH_SIZE = 50;

async function processBatchNotifications(notifications: any[]) {
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(notification => 
      NotificationTriggers.checkDocuments([notification], notification.company_id)
    ));
  }
}
```

---

## 🔒 Security Considerations

### API Key Management
- Store API keys in environment variables
- Rotate keys regularly
- Use service role keys only for backend operations

### Data Privacy
- RLS policies ensure users only see their own company's data
- Sensitive information is not logged
- Email/WhatsApp numbers are encrypted in database

### Rate Limiting
- Implement rate limiting for notification sending
- Monitor for abuse patterns
- Set reasonable limits per user/company

---

## 📚 API Reference

### NotificationTriggers Class

#### Methods

- `checkDocuments(documents: any[], companyId: string)` - Process document notifications
- `checkComplianceTasks(tasks: any[], companyId: string)` - Process task notifications  
- `checkEmployees(employees: any[], companyId: string)` - Process employee notifications

#### Constants

- `PROGRESSIVE_MILESTONES = [30, 15, 7, 1, 0]` - Notification milestones in days

### NotificationService Class

#### Methods

- `createNotification(data: CreateNotificationData)` - Create new notification
- `createDocumentNotification(...)` - Create document expiry notification
- `createComplianceNotification(...)` - Create task notification
- `createEmployeeNotification(...)` - Create employee notification

---

## 🎯 Best Practices

### Code Organization
- Keep notification logic separate from business logic
- Use consistent error handling patterns
- Log all important events for debugging

### Database Design
- Use appropriate constraints and indexes
- Implement proper RLS policies
- Keep audit trails for compliance

### User Experience
- Send notifications at appropriate times
- Provide clear action items in messages
- Allow users to manage notification preferences

---

## 🔄 Future Enhancements

### Planned Features

1. **Notification Preferences** - Allow users to customize notification settings
2. **SMS Support** - Add SMS notifications via Twilio
3. **Push Notifications** - Add mobile push notifications
4. **Digest Emails** - Send daily/weekly summary emails
5. **Analytics Dashboard** - Track notification effectiveness
6. **Multi-language Support** - Send notifications in multiple languages

### Scalability Improvements

1. **Queue System** - Implement job queue for better performance
2. **Microservices** - Separate notification service into microservice
3. **Caching** - Cache frequently accessed data
4. **Load Balancing** - Distribute notification processing

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Notifications not sending** - Check Edge Function logs
2. **Duplicate notifications** - Check notification_history table
3. **RLS errors** - Verify user permissions
4. **Email delivery failures** - Check Resend API status
5. **WhatsApp failures** - Verify Twilio configuration

### Debug Commands

```sql
-- Check recent notifications
SELECT * FROM notifications 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check failed deliveries
SELECT * FROM notification_logs 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check RLS policy effectiveness
SELECT COUNT(*) as total_notifications 
FROM notifications 
WHERE company_id = 'your-company-id';
```

---

## 📄 License

This notification system is part of the Compliance Guard project and follows the same licensing terms.

---

**Last Updated**: May 2, 2026  
**Version**: 1.0.0  
**Author**: Compliance Guard Development Team
