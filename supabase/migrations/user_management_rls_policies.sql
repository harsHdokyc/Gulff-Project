-- Migration: User Management RLS Policies
-- Ensures proper data isolation and prevents cross-organization data access

-- ========================================
-- 1. Enable RLS on all relevant tables
-- ========================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on companies table (if not already enabled)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. Drop existing policies to avoid conflicts
-- ========================================

-- Drop any existing user policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Company members can view users" ON users;
DROP POLICY IF EXISTS "Company members can view active users" ON users;

-- Drop any existing company policies
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Users can update own company" ON companies;

-- ========================================
-- 3. Users Table RLS Policies
-- ========================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Policy: Users can update their own profile (but not role or company)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    id = auth.uid() AND 
    -- Prevent users from changing their own role or company_id
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Policy: Authenticated users can insert their own profile (first row or same company).
-- Do not require an existing users row for company_id — that blocked first-time signup.
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND (
      NOT EXISTS (SELECT 1 FROM users existing WHERE existing.id = auth.uid())
      OR company_id IS NOT DISTINCT FROM (
        SELECT u.company_id FROM users u WHERE u.id = auth.uid() LIMIT 1
      )
    )
  );

-- Policy: Company owners can view all users in their company
CREATE POLICY "Company owners can view all users" ON users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Company owners can manage users in their company
CREATE POLICY "Company owners can manage users" ON users
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: PRO users can view users in their associated companies
CREATE POLICY "PROs can view company users" ON users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'pro'
    )
  );

-- ========================================
-- 4. Companies Table RLS Policies
-- ========================================

-- Policy: Users can view their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Policy: Company owners can update their company
CREATE POLICY "Company owners can update company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  ) WITH CHECK (
    id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ========================================
-- 5. Create Security Functions
-- ========================================

-- Function to check if user is company owner
CREATE OR REPLACE FUNCTION is_company_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is PRO
CREATE OR REPLACE FUNCTION is_pro_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'pro'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's company ID
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: user_belongs_to_company function removed as it's not needed
-- Company membership validation is handled directly in other functions

-- ========================================
-- 6. Create Audit Trigger for User Operations
-- ========================================

-- Create audit log table for user management
CREATE TABLE IF NOT EXISTS user_management_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'reset_password')),
  target_user_id UUID,
  target_user_email TEXT,
  performed_by UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Users can view own company audit logs" ON user_management_audit
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Trigger function for user management audit
CREATE OR REPLACE FUNCTION audit_user_management()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_management_audit (
      operation,
      target_user_id,
      target_user_email,
      performed_by,
      company_id,
      new_values
    ) VALUES (
      'create',
      NEW.id,
      NEW.email,
      auth.uid(),
      NEW.company_id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO user_management_audit (
      operation,
      target_user_id,
      target_user_email,
      performed_by,
      company_id,
      old_values,
      new_values
    ) VALUES (
      'update',
      NEW.id,
      NEW.email,
      auth.uid(),
      NEW.company_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_management_audit (
      operation,
      target_user_id,
      target_user_email,
      performed_by,
      company_id,
      old_values
    ) VALUES (
      'delete',
      OLD.id,
      OLD.email,
      auth.uid(),
      OLD.company_id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
DROP TRIGGER IF EXISTS user_management_audit_trigger ON users;
CREATE TRIGGER user_management_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_user_management();

-- ========================================
-- 7. Create Indexes for Performance
-- ========================================

-- Index for user lookups by company
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Index for user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for user lookups by role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Composite index for company + role queries
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_user_audit_company_id ON user_management_audit(company_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_performed_by ON user_management_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_user_audit_created_at ON user_management_audit(created_at);

-- ========================================
-- 8. Create Validation Functions
-- ========================================

-- Function to validate email uniqueness within company
CREATE OR REPLACE FUNCTION validate_email_within_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email already exists in the same company
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE email = NEW.email 
    AND company_id = NEW.company_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'Email already exists in this company';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_user_email_trigger ON users;
CREATE TRIGGER validate_user_email_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION validate_email_within_company();

-- ========================================
-- 9. Create Data Integrity Functions
-- ========================================

-- Function to ensure every company has at least one owner
CREATE OR REPLACE FUNCTION ensure_company_has_owner()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Count owners in the company (excluding the user being deleted)
  SELECT COUNT(*) INTO owner_count
  FROM users 
  WHERE company_id = OLD.company_id AND role = 'owner';
  
  -- Prevent deletion if this would leave the company without owners
  IF TG_OP = 'DELETE' AND OLD.role = 'owner' AND owner_count <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last owner of a company';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create owner protection trigger
DROP TRIGGER IF EXISTS protect_last_owner_trigger ON users;
CREATE TRIGGER protect_last_owner_trigger
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION ensure_company_has_owner();

-- ========================================
-- 10. Security Views for Admin Functions
-- ========================================

-- View for user statistics (company-scoped with RLS filtering)
CREATE OR REPLACE VIEW company_user_stats AS
SELECT 
  company_id,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'owner') as owner_count,
  COUNT(*) FILTER (WHERE role = 'pro') as pro_count,
  COUNT(*) FILTER (WHERE role = 'employee') as employee_count,
  MAX(created_at) as last_user_added
FROM users
-- RLS filtering will be applied by the underlying table
WHERE company_id IN (
  SELECT company_id FROM users 
  WHERE id = auth.uid() AND role = 'owner'
)
GROUP BY company_id;

-- Note: RLS cannot be enabled on views, company_user_stats will be handled by underlying table policies

-- ========================================
-- 11. Testing and Verification
-- ========================================

-- Function to test RLS policies (for development)
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(
  policy_name TEXT,
  test_result TEXT,
  details JSONB
) AS $$
DECLARE
    can_view_own_profile BOOLEAN;
    is_owner BOOLEAN;
    can_view_company_users BOOLEAN;
    cross_company_blocked BOOLEAN;
BEGIN
  -- Test 1: User can view own profile
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth.uid()) INTO can_view_own_profile;
  
  -- Test 2: Check if user is owner
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner') INTO is_owner;
  
  -- Test 3: Owner can view company users
  IF is_owner THEN
    SELECT EXISTS(
      SELECT 1 FROM users u 
      WHERE u.company_id = (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1)
    ) INTO can_view_company_users;
  ELSE
    can_view_company_users := FALSE;
  END IF;
  
  -- Test 4: Cross-company access blocked
  SELECT NOT EXISTS(
    SELECT 1 FROM users u 
    WHERE u.company_id != (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1)
    LIMIT 1
  ) INTO cross_company_blocked;
  
  -- Return results
  RETURN QUERY
  SELECT 
    'Own Profile Access'::TEXT,
    CASE WHEN can_view_own_profile THEN 'PASS' ELSE 'FAIL' END,
    jsonb_build_object('user_id', auth.uid())
  UNION ALL
  SELECT 
    'Owner Company Access'::TEXT,
    CASE WHEN is_owner AND can_view_company_users THEN 'PASS' ELSE 'FAIL' END,
    jsonb_build_object('is_owner', is_owner)
  UNION ALL
  SELECT 
    'Cross-Company Block'::TEXT,
    CASE WHEN cross_company_blocked THEN 'PASS' ELSE 'FAIL' END,
    jsonb_build_object('cross_company_blocked', cross_company_blocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 12. Comments and Documentation
-- ========================================

COMMENT ON TABLE users IS 'User profiles with role-based access control. RLS ensures company data isolation.';
COMMENT ON TABLE companies IS 'Company information with multi-tenant isolation via RLS.';
COMMENT ON TABLE user_management_audit IS 'Audit log for all user management operations with company scoping.';

COMMENT ON FUNCTION is_company_owner() IS 'Security function to check if current user is a company owner.';
COMMENT ON FUNCTION is_pro_user() IS 'Security function to check if current user is a PRO user.';
COMMENT ON FUNCTION get_current_company_id() IS 'Security function to get current user''s company ID.';
-- Note: user_belongs_to_company function removed - company membership validation handled in other functions

-- Final verification
SELECT 'User Management RLS Policies Applied Successfully' as status;
