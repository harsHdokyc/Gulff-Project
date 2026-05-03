import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🕐 Starting daily notification check at 10 AM');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active companies
    const { data: companies, error: companiesError } = await supabaseClient
      .from('companies')
      .select('id, name')
      .eq('status', 'active');

    if (companiesError) {
      console.error('❌ Error fetching companies:', companiesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch companies' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`📊 Found ${companies.length} active companies`);

    const totalNotifications = {
      documents: 0,
      tasks: 0,
      employees: 0,
      errors: 0
    };

    // Process each company
    for (const company of companies) {
      try {
        console.log(`🏢 Processing company: ${company.name} (${company.id})`);
        
        // Get documents for this company
        const { data: documents, error: docsError } = await supabaseClient
          .from('documents')
          .select('*')
          .eq('company_id', company.id);

        if (!docsError && documents) {
          const docResult = await processDocuments(supabaseClient, documents, company.id);
          totalNotifications.documents += docResult.notificationsCreated;
          console.log(`📄 ${company.name}: ${docResult.notificationsCreated} document notifications`);
        }

        // Get compliance tasks for this company
        const { data: tasks, error: tasksError } = await supabaseClient
          .from('compliance_tasks')
          .select('*')
          .eq('company_id', company.id)
          .neq('status', 'completed');

        if (!tasksError && tasks) {
          const taskResult = await processTasks(supabaseClient, tasks, company.id);
          totalNotifications.tasks += taskResult.notificationsCreated;
          console.log(`✅ ${company.name}: ${taskResult.notificationsCreated} task notifications`);
        }

        // Get employees for this company
        const { data: employees, error: empError } = await supabaseClient
          .from('employees')
          .select('*')
          .eq('company_id', company.id);

        if (!empError && employees) {
          const empResult = await processEmployees(supabaseClient, employees, company.id);
          totalNotifications.employees += empResult.notificationsCreated;
          console.log(`👥 ${company.name}: ${empResult.notificationsCreated} employee notifications`);
        }

      } catch (error) {
        console.error(`❌ Error processing company ${company.name}:`, error);
        totalNotifications.errors++;
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      companies_processed: companies.length,
      notifications_created: {
        documents: totalNotifications.documents,
        tasks: totalNotifications.tasks,
        employees: totalNotifications.employees,
        total: totalNotifications.documents + totalNotifications.tasks + totalNotifications.employees
      },
      errors: totalNotifications.errors
    };

    console.log('📊 Daily notification check completed:', summary);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Daily notification check failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Progressive notification milestones
const PROGRESSIVE_MILESTONES = [30, 15, 7, 1, 0];

async function processDocuments(supabaseClient: any, documents: any[], companyId: string) {
  const now = new Date();
  let notificationsCreated = 0;

  for (const doc of documents) {
    if (!doc.expiry_date || doc.status === 'complete') continue;
    
    const expiryDate = new Date(doc.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if today is a notification milestone
    if (PROGRESSIVE_MILESTONES.includes(daysUntilExpiry)) {
      // Check if this milestone was already sent
      const { data: existingMilestone } = await supabaseClient
        .from('notification_history')
        .select('*')
        .eq('entity_id', doc.id)
        .eq('entity_type', 'document')
        .eq('milestone_days', daysUntilExpiry)
        .eq('company_id', companyId)
        .single();
        
      if (existingMilestone) continue;
      
      // Get company owner
      const { data: owner } = await supabaseClient
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .eq('role', 'owner')
        .single();
        
      if (owner) {
        const result = await createDocumentNotification(supabaseClient, owner.id, companyId, doc.id, doc.name, daysUntilExpiry);
        
        if (result.success) {
          // Track milestone
          await supabaseClient
            .from('notification_history')
            .insert({
              entity_id: doc.id,
              entity_type: 'document',
              milestone_days: daysUntilExpiry,
              company_id: companyId,
              sent_at: new Date().toISOString()
            });
          
          notificationsCreated++;
        }
      }
    }
  }

  return { notificationsCreated };
}

async function processTasks(supabaseClient: any, tasks: any[], companyId: string) {
  const now = new Date();
  let notificationsCreated = 0;

  for (const task of tasks) {
    const dueDate = new Date(task.due_date);
    const daysUntilExpiry = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if today is a notification milestone
    if (PROGRESSIVE_MILESTONES.includes(daysUntilExpiry)) {
      // Check if this milestone was already sent
      const { data: existingMilestone } = await supabaseClient
        .from('notification_history')
        .select('*')
        .eq('entity_id', task.id)
        .eq('entity_type', 'task')
        .eq('milestone_days', daysUntilExpiry)
        .eq('company_id', companyId)
        .single();
        
      if (existingMilestone) continue;
      
      // Get company owner
      const { data: owner } = await supabaseClient
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .eq('role', 'owner')
        .single();
        
      if (owner) {
        const result = await createTaskNotification(supabaseClient, owner.id, companyId, task.id, task.type, daysUntilExpiry);
        
        if (result.success) {
          // Track milestone
          await supabaseClient
            .from('notification_history')
            .insert({
              entity_id: task.id,
              entity_type: 'task',
              milestone_days: daysUntilExpiry,
              company_id: companyId,
              sent_at: new Date().toISOString()
            });
          
          notificationsCreated++;
        }
      }
    }
  }

  return { notificationsCreated };
}

async function processEmployees(supabaseClient: any, employees: any[], companyId: string) {
  const now = new Date();
  let notificationsCreated = 0;

  for (const employee of employees) {
    const visaDays = employee.visa_expiry ? 
      Math.ceil((new Date(employee.visa_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const emiratesIdDays = employee.emirates_id_expiry ? 
      Math.ceil((new Date(employee.emirates_id_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    const minDays = Math.min(visaDays, emiratesIdDays);
    
    // Check if today is a notification milestone
    if (PROGRESSIVE_MILESTONES.includes(minDays)) {
      // Check if this milestone was already sent
      const { data: existingMilestone } = await supabaseClient
        .from('notification_history')
        .select('*')
        .eq('entity_id', employee.id)
        .eq('entity_type', 'employee')
        .eq('milestone_days', minDays)
        .eq('company_id', companyId)
        .single();
        
      if (existingMilestone) continue;
      
      // Get company owner
      const { data: owner } = await supabaseClient
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .eq('role', 'owner')
        .single();
        
      if (owner) {
        const result = await createEmployeeNotification(supabaseClient, owner.id, companyId, employee.id, employee.name, visaDays, emiratesIdDays);
        
        if (result.success) {
          // Track milestone
          await supabaseClient
            .from('notification_history')
            .insert({
              entity_id: employee.id,
              entity_type: 'employee',
              milestone_days: minDays,
              company_id: companyId,
              sent_at: new Date().toISOString()
            });
          
          notificationsCreated++;
        }
      }
    }
  }

  return { notificationsCreated };
}

async function createDocumentNotification(supabaseClient: any, userId: string, companyId: string, documentId: string, documentName: string, daysUntilExpiry: number) {
  const urgencyLevel = calculateUrgencyLevel(daysUntilExpiry);
  const type = getTypeFromUrgency(daysUntilExpiry);
  const message = generateDocumentMessage(documentName, daysUntilExpiry);
  
  const { error } = await supabaseClient
    .from('notifications')
    .insert({
      user_id: userId,
      company_id: companyId,
      message,
      type,
      channel: 'email',
      urgency_level: urgencyLevel,
      document_id: documentId,
    });

  return { success: !error, error };
}

async function createTaskNotification(supabaseClient: any, userId: string, companyId: string, taskId: string, taskType: string, daysUntilExpiry: number) {
  const urgencyLevel = calculateUrgencyLevel(daysUntilExpiry);
  const type = getTypeFromUrgency(daysUntilExpiry);
  const message = generateTaskMessage(taskType, daysUntilExpiry);
  
  const { error } = await supabaseClient
    .from('notifications')
    .insert({
      user_id: userId,
      company_id: companyId,
      message,
      type,
      channel: 'email',
      urgency_level: urgencyLevel,
      task_id: taskId,
    });

  return { success: !error, error };
}

async function createEmployeeNotification(supabaseClient: any, userId: string, companyId: string, employeeId: string, employeeName: string, visaDays: number, emiratesIdDays: number) {
  const minDays = Math.min(visaDays, emiratesIdDays);
  const urgencyLevel = calculateUrgencyLevel(minDays);
  const type = getTypeFromUrgency(minDays);
  const message = generateEmployeeMessage(employeeName, visaDays, emiratesIdDays);
  
  const { error } = await supabaseClient
    .from('notifications')
    .insert({
      user_id: userId,
      company_id: companyId,
      message,
      type,
      channel: 'email',
      urgency_level: urgencyLevel,
      employee_id: employeeId,
    });

  return { success: !error, error };
}

function calculateUrgencyLevel(daysUntilExpiry: number): number {
  if (daysUntilExpiry <= 7) return 3;
  if (daysUntilExpiry <= 15) return 2;
  return 1;
}

function getTypeFromUrgency(daysUntilExpiry: number): 'info' | 'warning' | 'danger' {
  if (daysUntilExpiry <= 7) return 'danger';
  if (daysUntilExpiry <= 15) return 'warning';
  return 'info';
}

function generateDocumentMessage(documentName: string, daysUntilExpiry: number): string {
  const urgency = getUrgencyLabel(daysUntilExpiry);
  const actionLevel = getActionLevel(daysUntilExpiry);
  
  return `Why you're receiving this:
Your document "${documentName}" ${urgency} and requires attention.

Purpose:
Valid documentation is required for business operations and compliance.

Action Required:
${actionLevel}

Deadline: ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days remaining` : 'Expired today'}

Consequences of inaction:
${getConsequences(daysUntilExpiry)}`;
}

function generateTaskMessage(taskType: string, daysUntilExpiry: number): string {
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

function generateEmployeeMessage(employeeName: string, visaDays: number, emiratesIdDays: number): string {
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

function getUrgencyLabel(daysUntilExpiry: number): string {
  if (daysUntilExpiry <= 0) return 'has expired';
  if (daysUntilExpiry === 1) return 'expires tomorrow';
  if (daysUntilExpiry <= 7) return 'expires this week';
  if (daysUntilExpiry <= 15) return 'expires soon';
  return 'is approaching expiry';
}

function getActionLevel(daysUntilExpiry: number): string {
  if (daysUntilExpiry <= 0) return 'URGENT: Upload the renewed document immediately to avoid business disruptions.';
  if (daysUntilExpiry === 1) return 'CRITICAL: Renew and upload the document today - expiry is imminent.';
  if (daysUntilExpiry <= 7) return 'HIGH PRIORITY: Initiate renewal process and upload updated document.';
  if (daysUntilExpiry <= 15) return 'IMPORTANT: Begin renewal process to ensure timely completion.';
  return 'Plan ahead: Start gathering renewal requirements to avoid last-minute issues.';
}

function getConsequences(daysUntilExpiry: number): string {
  if (daysUntilExpiry <= 0) return '- Immediate business operation disruptions\n- Regulatory non-compliance penalties\n- Service interruptions and potential fines';
  if (daysUntilExpiry === 1) return '- Business suspension tomorrow\n- Financial penalties and legal issues\n- Loss of operational licenses';
  if (daysUntilExpiry <= 7) return '- Business operation disruptions within week\n- Regulatory compliance violations\n- Potential service interruptions';
  if (daysUntilExpiry <= 15) return '- Risk of business disruptions\n- Compliance violations possible\n- Service interruptions likely';
  return '- Future business operation risks\n- Planning ahead prevents issues\n- Avoid last-minute renewal problems';
}
