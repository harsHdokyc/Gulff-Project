-- Complete User Cleanup Migration
-- This ensures all user data is properly cleaned up when a user is deleted
-- Prevents confusion when users with same email are recreated

-- ========================================
-- 1. Create User Cleanup Function
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete user's notifications
    DELETE FROM notifications WHERE user_id = OLD.id;
    
    -- Note: We don't delete company data here as it may be shared
    -- Company deletion should be handled separately
    
    -- Log the cleanup for auditing
    INSERT INTO notifications (
        user_id, 
        company_id, 
        message, 
        type, 
        channel, 
        read,
        created_at
    ) VALUES (
        OLD.id,
        OLD.company_id,
        'User account and personal data cleaned up',
        'info',
        'in-app',
        TRUE,
        NOW()
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. Create Trigger for User Cleanup
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS cleanup_user_on_delete ON users;

-- Create trigger to automatically clean up user data
CREATE TRIGGER cleanup_user_on_delete
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION cleanup_user_data();

-- ========================================
-- 3. Create Safe User Deletion Function
-- ========================================

-- Function to safely delete a user with all their data
CREATE OR REPLACE FUNCTION delete_user_completely(
    user_email TEXT,
    delete_company_data BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
    target_company_id UUID;
    user_count INTEGER;
BEGIN
    -- Find the user
    SELECT id, company_id INTO target_user_id, target_company_id
    FROM users 
    WHERE email = user_email;
    
    -- Check if user exists
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Check if user is the only one in company
    SELECT COUNT(*) INTO user_count
    FROM users 
    WHERE company_id = target_company_id;
    
    -- Prevent deletion if user is the only company member and company data deletion is not requested
    IF user_count = 1 AND NOT delete_company_data THEN
        RAISE EXCEPTION 'Cannot delete user: They are the only member of their company. Use delete_company_data=true to delete all company data.';
    END IF;
    
    -- Start transaction for atomic deletion
    BEGIN
        -- Delete user's notifications
        DELETE FROM notifications WHERE user_id = target_user_id;
        
        -- If requested, delete all company data
        IF delete_company_data THEN
            DELETE FROM notifications WHERE company_id = target_company_id;
            DELETE FROM documents WHERE company_id = target_company_id;
            DELETE FROM employees WHERE company_id = target_company_id;
            DELETE FROM compliance_tasks WHERE company_id = target_company_id;
            DELETE FROM companies WHERE id = target_company_id;
        END IF;
        
        -- Delete the user record
        DELETE FROM users WHERE id = target_user_id;
        
        -- Delete from Supabase Auth
        DELETE FROM auth.users WHERE email = user_email;
        
        COMMIT;
        RETURN TRUE;
        
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. Create User Status Management
-- ========================================

-- Add status column to users table for soft delete functionality
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_user(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET status = 'inactive', updated_at = NOW()
    WHERE email = user_email;
    
    -- Also delete from auth.users to prevent login
    DELETE FROM auth.users WHERE email = user_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. Create Orphaned Data Cleanup Function
-- ========================================

-- Function to clean up any orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
    deleted_rows INTEGER;
BEGIN
    -- Clean up notifications with invalid users
    DELETE FROM notifications 
    WHERE user_id NOT IN (SELECT id FROM users WHERE status = 'active');
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    cleanup_count := cleanup_count + deleted_rows;
    
    -- Clean up notifications with invalid companies
    DELETE FROM notifications 
    WHERE company_id NOT IN (SELECT id FROM companies);
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    cleanup_count := cleanup_count + deleted_rows;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. Update RLS Policies for Status
-- ========================================

-- Update users policy to respect status
DROP POLICY IF EXISTS "Company members can view users" ON users;
CREATE POLICY "Company members can view active users" ON users
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid()) 
    AND status = 'active'
  );

-- ========================================
-- 7. Create Audit Log for User Operations
-- ========================================

CREATE TABLE IF NOT EXISTS user_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('delete', 'soft_delete', 'reactivate')),
    performed_by UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for audit log (only company admins can view)
CREATE POLICY "Company admins can view audit log" ON user_audit_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ========================================
-- 8. Create Enhanced Delete Function with Audit
-- ========================================

CREATE OR REPLACE FUNCTION delete_user_with_audit(
    user_email TEXT,
    delete_company_data BOOLEAN DEFAULT FALSE,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
    target_company_id UUID;
    user_role TEXT;
BEGIN
    -- Get user details
    SELECT id, company_id, role INTO target_user_id, target_company_id, user_role
    FROM users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Log the deletion
    INSERT INTO user_audit_log (
        user_email, 
        operation, 
        performed_by, 
        company_id, 
        details
    ) VALUES (
        user_email,
        CASE WHEN delete_company_data THEN 'delete_company' ELSE 'delete' END,
        auth.uid(),
        target_company_id,
        jsonb_build_object(
            'user_role', user_role,
            'delete_company_data', delete_company_data,
            'reason', reason
        )
    );
    
    -- Perform the deletion
    RETURN delete_user_completely(user_email, delete_company_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. Grant Permissions
-- ========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_completely TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_data TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_with_audit TO authenticated;

-- Only allow service role to execute the cleanup function directly
GRANT EXECUTE ON FUNCTION cleanup_user_data TO service_role;

-- ========================================
-- 10. Create Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_email ON user_audit_log(user_email);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON user_audit_log(created_at);

-- ========================================
-- Usage Examples:
-- ========================================

/*
-- Soft delete (recommended for most cases)
SELECT soft_delete_user('user@example.com');

-- Complete delete with company data
SELECT delete_user_with_audit('user@example.com', true, 'Company closed');

-- Complete delete without company data (only if other users exist)
SELECT delete_user_with_audit('user@example.com', false, 'User left company');

-- Clean up any orphaned data
SELECT cleanup_orphaned_data();
*/
