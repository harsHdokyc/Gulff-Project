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
   * Check and trigger compliance task notifications
   * Call this when tasks are loaded or updated
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
   * Check and trigger document notifications
   * Call this when documents are loaded or updated
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
   * Check and trigger employee notifications
   * Call this when employees are loaded or updated
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
