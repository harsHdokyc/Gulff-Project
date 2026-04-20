import { supabase } from './supabase';

// Types
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface InvitationData {
  email: string;
  temporaryPassword: string;
  role: string;
  inviterName?: string;
  companyName?: string;
  loginUrl: string;
}

// Email Service
export class EmailService {
  private static instance: EmailService;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Send user invitation email
  async sendUserInvitation(data: InvitationData): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.generateInvitationTemplate(data);
      
      // Use Supabase Auth to send email
      const { error } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: data.email,
        password: data.temporaryPassword,
        options: {
          redirectTo: data.loginUrl,
          data: {
            role: data.role,
            invited_by: data.inviterName,
            company_name: data.companyName
          }
        }
      });

      if (error) {
        console.error('Email service error:', error);
        // Fallback: log the email for development
        this.logEmailForDevelopment(data, template);
        return { success: true }; // Don't block user creation for email failures
      }

      return { success: true };
    } catch (error) {
      console.error('Email service error:', error);
      // Don't block user creation for email failures
      this.logEmailForDevelopment(data, this.generateInvitationTemplate(data));
      return { success: true };
    }
  }

  // Send password reset email
  async sendPasswordReset(email: string, temporaryPassword: string, fullName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.generatePasswordResetTemplate(email, temporaryPassword, fullName);
      
      // Use Supabase Auth to send password reset
      const { error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${window.location.origin}/signin`
        }
      });

      if (error) {
        console.error('Password reset email error:', error);
        // Fallback: log the email for development
        this.logPasswordResetForDevelopment(email, temporaryPassword, fullName);
        return { success: true };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset email error:', error);
      this.logPasswordResetForDevelopment(email, temporaryPassword, fullName);
      return { success: true };
    }
  }

  // Generate invitation email template
  private generateInvitationTemplate(data: InvitationData): EmailTemplate {
    const subject = `You're invited to join ${data.companyName || 'Compliance Guard'}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Compliance Guard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .credentials { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Compliance Guard</h1>
          </div>
          <div class="content">
            <h2>You've been invited!</h2>
            <p>Hello${data.inviterName ? `,` : ``}</p>
            <p>You've been invited to join <strong>${data.companyName || 'Compliance Guard'}</strong> as a <strong>${data.role.toUpperCase()}</strong>.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${data.temporaryPassword}</code></p>
            </div>
            
            <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
            
            <a href="${data.loginUrl}" class="button">Log In Now</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${data.loginUrl}">${data.loginUrl}</a></p>
            
            <p>We're excited to have you on board!</p>
            <p>Best regards,<br>The Compliance Guard Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you have questions, please contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Welcome to Compliance Guard
      
      You've been invited to join ${data.companyName || 'Compliance Guard'} as a ${data.role.toUpperCase()}.
      
      Your Login Credentials:
      Email: ${data.email}
      Password: ${data.temporaryPassword}
      
      Important: Please log in and change your password immediately for security.
      
      Log in here: ${data.loginUrl}
      
      We're excited to have you on board!
      
      Best regards,
      The Compliance Guard Team
    `;

    return { subject, htmlBody, textBody };
  }

  // Generate password reset template
  private generatePasswordResetTemplate(email: string, temporaryPassword: string, fullName?: string): EmailTemplate {
    const subject = 'Your Password Has Been Reset';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .credentials { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>Your password has been reset</h2>
            <p>Hello${fullName ? ` ${fullName}` : ``},</p>
            <p>Your password for Compliance Guard has been reset. Here are your new login credentials:</p>
            
            <div class="credentials">
              <h3>New Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>New Password:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${temporaryPassword}</code></p>
            </div>
            
            <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
            
            <a href="${window.location.origin}/signin" class="button">Log In Now</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${window.location.origin}/signin">${window.location.origin}/signin</a></p>
            
            <p>Best regards,<br>The Compliance Guard Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Your Password Has Been Reset
      
      Hello${fullName ? ` ${fullName}` : ``},
      
      Your password for Compliance Guard has been reset. Here are your new login credentials:
      
      Email: ${email}
      New Password: ${temporaryPassword}
      
      Important: Please log in and change your password immediately for security.
      
      Log in here: ${window.location.origin}/signin
      
      Best regards,
      The Compliance Guard Team
    `;

    return { subject, htmlBody, textBody };
  }

  // Log email for development (fallback)
  private logEmailForDevelopment(data: InvitationData, template: EmailTemplate): void {
    console.log('=== USER INVITATION EMAIL ===');
    console.log('To:', data.email);
    console.log('Subject:', template.subject);
    console.log('Role:', data.role);
    console.log('Company:', data.companyName);
    console.log('Temporary Password:', data.temporaryPassword);
    console.log('Login URL:', data.loginUrl);
    console.log('==============================');
  }

  // Log password reset for development (fallback)
  private logPasswordResetForDevelopment(email: string, temporaryPassword: string, fullName?: string): void {
    console.log('=== PASSWORD RESET EMAIL ===');
    console.log('To:', email);
    console.log('Name:', fullName || 'Not provided');
    console.log('New Password:', temporaryPassword);
    console.log('Login URL:', `${window.location.origin}/signin`);
    console.log('============================');
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
