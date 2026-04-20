# User Management Module Implementation

## Overview
Implementation of a secure user management system where only owners can sign up, and they create/manage PRO and employee accounts internally.

## Current System Analysis
- All users currently sign up and get "employee" role by default
- No distinction between owners, PROs, and employees during registration
- Missing user management interface for owners

## Proposed System Architecture

### 1. Sign-up Flow Changes
- **Only owners can sign up** directly via `/signup`
- First user of each company automatically gets **"owner" role**
- Remove public sign-up for PRO/employee roles

### 2. User Management Module (Owner Only)
Location: `/user-management` route (accessible only to owners)

**Features:**
- Create new PRO users
- Create new employee users
- Generate secure random passwords
- Send invitation emails with credentials
- View/manage existing users
- Deactivate/activate users
- Reset user passwords
- Role management (promote/demote)

### 3. Login Flow
- Owners: Login via `/signin` (existing)
- PROs/Employees: Login via `/signin` using credentials provided by owner
- No sign-up access for PROs/employees

## Implementation Plan

### Phase 1: Database & Backend Changes

#### 1.1 Update User Creation Logic
```sql
-- Modify trigger to assign owner role to first user of each company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    company_user_count INTEGER;
BEGIN
    -- Count existing users for this company
    SELECT COUNT(*) INTO company_user_count 
    FROM users 
    WHERE company_id = new.company_id;
    
    -- First user becomes owner, others become employee (will be updated by owner later)
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 
        CASE WHEN company_user_count = 0 THEN 'owner' ELSE 'employee' END
    );
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.2 Create User Management Functions
```sql
-- Function for owners to create new users
CREATE OR REPLACE FUNCTION create_user_for_company(
    user_email TEXT,
    user_role TEXT,
    company_id UUID,
    generated_password TEXT
)
RETURNS UUID AS $$
BEGIN
    INSERT INTO users (email, company_id, role, full_name)
    VALUES (user_email, company_id, user_role, '')
    RETURNING id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is owner
CREATE OR REPLACE FUNCTION is_company_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.3 Update RLS Policies
```sql
-- Only owners can create new users
CREATE POLICY "Owners can create users" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT id FROM users WHERE role = 'owner' 
        AND company_id = company_id
    )
  );

-- Only owners can view/manage all company users
CREATE POLICY "Owners can manage all users" ON users
  FOR ALL USING (
    company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'owner'
    )
  );
```

### Phase 2: Backend Services

#### 2.1 Create User Management Service
File: `src/lib/userManagementService.ts`

```typescript
export interface CreateUserData {
  email: string;
  role: 'pro' | 'employee';
  fullName?: string;
}

export interface UserCredentials {
  email: string;
  temporaryPassword: string;
}

export class UserManagementService {
  // Create new user and send invitation
  async createUserAndInvite(data: CreateUserData): Promise<{success: boolean, error?: string}> {
    // 1. Generate secure password
    const tempPassword = this.generateSecurePassword();
    
    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: false
    });
    
    if (authError) return { success: false, error: authError.message };
    
    // 3. Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        role: data.role,
        company_id: await this.getCurrentCompanyId(),
        full_name: data.fullName || ''
      });
    
    if (profileError) return { success: false, error: profileError.message };
    
    // 4. Send invitation email
    await this.sendInvitationEmail(data.email, tempPassword, data.role);
    
    return { success: true };
  }
  
  // Generate secure random password
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  
  // Send invitation email
  private async sendInvitationEmail(email: string, password: string, role: string) {
    // Use Supabase email templates or external service
    const { error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      data: {
        role: role,
        invited_by_owner: true
      }
    });
    
    return error;
  }
  
  // Get current user's company ID
  private async getCurrentCompanyId(): Promise<UUID> {
    const { data } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', await this.getCurrentUserId())
      .single();
    
    return data?.company_id;
  }
  
  // Get current user ID
  private async getCurrentUserId(): Promise<UUID> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }
}
```

### Phase 3: Frontend Implementation

#### 3.1 Create User Management Page
File: `src/pages/UserManagementPage.tsx`

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { userManagementService, type CreateUserData } from '@/lib/userManagementService';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({
    email: '',
    role: 'employee',
    fullName: ''
  });

  // Load existing users
  const loadUsers = async () => {
    // Implementation to fetch all company users
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const result = await userManagementService.createUserAndInvite(newUser);
    
    if (result.success) {
      toast({
        title: "User created successfully",
        description: `Invitation sent to ${newUser.email}`
      });
      setNewUser({ email: '', role: 'employee', fullName: '' });
      loadUsers(); // Refresh user list
    } else {
      toast({
        title: "Failed to create user",
        description: result.error,
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Create User Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={newUser.fullName}
                onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value as 'pro' | 'employee'})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">PRO</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create User & Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Existing Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
        </CardHeader>
        <CardContent>
          {/* User list implementation */}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;
```

#### 3.2 Update Navigation
Add user management link to owner navigation in `AppLayout.tsx`:

```typescript
// Only show for owners
{userRole === 'owner' && (
  <Link to="/user-management">
    <Button variant="outline">User Management</Button>
  </Link>
)}
```

#### 3.3 Update Sign-up Logic
Modify `SignUpPage.tsx` to automatically assign owner role:

```typescript
// In the handleSignUp function, add role assignment
const { error } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    data: {
      company: data.company,
      whatsapp: data.whatsapp,
      onboarding_completed: false,
      role: 'owner' // Auto-assign owner role
    }
  }
});
```

### Phase 4: Email Templates

#### 4.1 Invitation Email Template
```html
Subject: You're invited to join Compliance Guard

Hi {{fullName}},

You've been invited to join {{companyName}} on Compliance Guard as a {{role}}.

Login Credentials:
- Email: {{email}}
- Temporary Password: {{password}}

Please log in and change your password immediately for security.

Login URL: {{loginUrl}}

Best regards,
The Compliance Guard Team
```

### Phase 5: Security Considerations

#### 5.1 Password Security
- Generate 12+ character random passwords
- Include special characters, numbers, uppercase/lowercase
- Force password change on first login
- Set password expiration for temporary passwords

#### 5.2 Access Control
- Verify owner status before allowing user management
- Use RLS policies to enforce role-based access
- Log all user creation/deletion activities

#### 5.3 Email Security
- Use secure email delivery
- Include expiration time for temporary passwords
- Don't include passwords in URL parameters

### Phase 6: Testing Plan

#### 6.1 Unit Tests
- Test user creation service
- Test password generation
- Test email sending functionality
- Test role assignment logic

#### 6.2 Integration Tests
- Test complete user creation flow
- Test invitation email delivery
- Test login with created credentials
- Test role-based access control

#### 6.3 User Acceptance Tests
- Test owner can create PRO users
- Test owner can create employee users
- Test PRO/employee cannot access user management
- Test password reset functionality

## Implementation Timeline

### Week 1: Backend Setup
- Database functions and triggers
- User management service
- Email templates

### Week 2: Frontend Development
- User management page
- Navigation updates
- Sign-up flow changes

### Week 3: Testing & Deployment
- Unit and integration tests
- Security testing
- Production deployment

## Success Metrics

- Reduced unauthorized account creation
- Improved user management efficiency
- Enhanced security posture
- Better audit trail compliance
- Streamlined onboarding for teams

## Next Steps

1. Review and approve this implementation plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews and adjustments
