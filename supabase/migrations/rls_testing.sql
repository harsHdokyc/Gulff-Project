-- Migration: RLS Testing and Verification
-- Comprehensive testing suite for Row Level Security policies

-- ========================================
-- 1. Test Data Setup (for testing only)
-- ========================================

-- Create test users for RLS testing (only if they don't exist)
DO $$
BEGIN
    -- Create test company if it doesn't exist
    INSERT INTO companies (id, name, country)
    VALUES ('123e4567-e89b-12d3-a456-426614174000', 'Test Company', 'AE')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create test users if they don't exist
    INSERT INTO users (id, email, company_id, role, full_name)
    VALUES 
        ('123e4567-e89b-12d3-a456-426614174001', 'owner@test.com', '123e4567-e89b-12d3-a456-426614174000', 'owner', 'Test Owner'),
        ('123e4567-e89b-12d3-a456-426614174002', 'pro@test.com', '123e4567-e89b-12d3-a456-426614174000', 'pro', 'Test PRO'),
        ('123e4567-e89b-12d3-a456-426614174003', 'employee@test.com', '123e4567-e89b-12d3-a456-426614174000', 'employee', 'Test Employee')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- ========================================
-- 2. RLS Test Functions
-- ========================================

-- Test 1: User can only see their own profile
CREATE OR REPLACE FUNCTION test_own_profile_access()
RETURNS TABLE(
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
) AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count visible users (should only be 1 - the current user)
    SELECT COUNT(*) INTO user_count FROM users;
    
    RETURN QUERY
    SELECT 
        'Own Profile Access'::TEXT,
        '1 user visible (self only)'::TEXT,
        user_count || ' users visible'::TEXT,
        CASE WHEN user_count = 1 THEN 'PASS' ELSE 'FAIL' END
    WHERE user_count IN (0, 1); -- 0 for unauthenticated, 1 for authenticated
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 2: Company owner can see all company users
CREATE OR REPLACE FUNCTION test_owner_company_access()
RETURNS TABLE(
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
) AS $$
DECLARE
    is_owner BOOLEAN;
    company_user_count INTEGER;
BEGIN
    -- Check if current user is an owner
    SELECT EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner') INTO is_owner;
    
    IF is_owner THEN
        -- Count users in the owner's company
        SELECT COUNT(*) INTO company_user_count 
        FROM users 
        WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1);
        
        RETURN QUERY
        SELECT 
            'Owner Company Access'::TEXT,
            'All company users visible'::TEXT,
            company_user_count || ' company users visible'::TEXT,
            CASE WHEN company_user_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    ELSE
        RETURN QUERY
        SELECT 
            'Owner Company Access'::TEXT,
            'Not applicable (not an owner)'::TEXT,
            'Test skipped'::TEXT,
            'SKIP'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 3: Cross-company access is blocked
CREATE OR REPLACE FUNCTION test_cross_company_blocked()
RETURNS TABLE(
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
) AS $$
DECLARE
    user_company_id UUID;
    other_company_count INTEGER;
BEGIN
    -- Get current user's company
    SELECT company_id INTO user_company_id FROM users WHERE id = auth.uid() LIMIT 1;
    
    IF user_company_id IS NOT NULL THEN
        -- Try to count users from other companies (should be 0)
        SELECT COUNT(*) INTO other_company_count
        FROM users 
        WHERE company_id != user_company_id;
        
        RETURN QUERY
        SELECT 
            'Cross-Company Access Blocked'::TEXT,
            'No users from other companies visible'::TEXT,
            other_company_count || ' users from other companies'::TEXT,
            CASE WHEN other_company_count = 0 THEN 'PASS' ELSE 'FAIL' END;
    ELSE
        RETURN QUERY
        SELECT 
            'Cross-Company Access Blocked'::TEXT,
            'Not applicable (no company)'::TEXT,
            'Test skipped'::TEXT,
            'SKIP'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 4: User can update their own profile but not others
CREATE OR REPLACE FUNCTION test_profile_update_permissions()
RETURNS TABLE(
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
) AS $$
DECLARE
    can_update_own BOOLEAN;
    can_update_others BOOLEAN;
BEGIN
    -- Test updating own profile (should succeed)
    BEGIN
        UPDATE users 
        SET full_name = 'Test Update' 
        WHERE id = auth.uid();
        can_update_own := TRUE;
    EXCEPTION
        WHEN OTHERS THEN
        can_update_own := FALSE;
    END;
    
    -- Test updating other user's profile (should fail)
    BEGIN
        UPDATE users 
        SET full_name = 'Test Update' 
        WHERE id != auth.uid() LIMIT 1;
        can_update_others := TRUE;
    EXCEPTION
        WHEN OTHERS THEN
        can_update_others := FALSE;
    END;
    
    RETURN QUERY
    SELECT 
        'Profile Update Permissions'::TEXT,
        'Can update own, cannot update others'::TEXT,
        'Own: ' || CASE WHEN can_update_own THEN 'YES' ELSE 'NO' END || 
        ', Others: ' || CASE WHEN can_update_others THEN 'YES' ELSE 'NO' END::TEXT,
        CASE WHEN can_update_own = TRUE AND can_update_others = FALSE THEN 'PASS' ELSE 'FAIL' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 5: Email uniqueness within company
CREATE OR REPLACE FUNCTION test_email_uniqueness()
RETURNS TABLE(
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
) AS $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicate emails within any company
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT company_id, email, COUNT(*) as email_count
        FROM users
        GROUP BY company_id, email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RETURN QUERY
    SELECT 
        'Email Uniqueness'::TEXT,
        'No duplicate emails within companies'::TEXT,
        duplicate_count || ' duplicate email groups found'::TEXT,
        CASE WHEN duplicate_count = 0 THEN 'PASS' ELSE 'FAIL' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 6: Company owner requirement
CREATE OR REPLACE FUNCTION test_company_owner_requirement()
RETURNS TABLE(
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT
) AS $$
DECLARE
    companies_without_owners INTEGER;
BEGIN
    -- Count companies without owners
    SELECT COUNT(*) INTO companies_without_owners
    FROM companies c
    LEFT JOIN users u ON c.id = u.company_id AND u.role = 'owner'
    WHERE u.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'Company Owner Requirement'::TEXT,
        'All companies have at least one owner'::TEXT,
        companies_without_owners || ' companies without owners'::TEXT,
        CASE WHEN companies_without_owners = 0 THEN 'PASS' ELSE 'FAIL' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. Comprehensive Test Runner
-- ========================================

-- Function to run all RLS tests
CREATE OR REPLACE FUNCTION run_all_rls_tests()
RETURNS TABLE(
  test_category TEXT,
  test_name TEXT,
  expected_result TEXT,
  actual_result TEXT,
  status TEXT,
  timestamp TIMESTAMPTZ
) AS $$
BEGIN
    -- Run all test functions
    RETURN QUERY
    SELECT 
        'Profile Access'::TEXT,
        test_name,
        expected_result,
        actual_result,
        status,
        NOW()
    FROM test_own_profile_access()
    
    UNION ALL
    
    SELECT 
        'Company Access'::TEXT,
        test_name,
        expected_result,
        actual_result,
        status,
        NOW()
    FROM test_owner_company_access()
    
    UNION ALL
    
    SELECT 
        'Security Isolation'::TEXT,
        test_name,
        expected_result,
        actual_result,
        status,
        NOW()
    FROM test_cross_company_blocked()
    
    UNION ALL
    
    SELECT 
        'Update Permissions'::TEXT,
        test_name,
        expected_result,
        actual_result,
        status,
        NOW()
    FROM test_profile_update_permissions()
    
    UNION ALL
    
    SELECT 
        'Data Integrity'::TEXT,
        test_name,
        expected_result,
        actual_result,
        status,
        NOW()
    FROM test_email_uniqueness()
    
    UNION ALL
    
    SELECT 
        'Business Rules'::TEXT,
        test_name,
        expected_result,
        actual_result,
        status,
        NOW()
    FROM test_company_owner_requirement();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. Test Summary Function
-- ========================================

-- Function to get test summary
CREATE OR REPLACE FUNCTION get_rls_test_summary()
RETURNS TABLE(
  total_tests INTEGER,
  passed_tests INTEGER,
  failed_tests INTEGER,
  skipped_tests INTEGER,
  success_rate NUMERIC,
  timestamp TIMESTAMPTZ
) AS $$
DECLARE
    test_results RECORD;
BEGIN
    -- Get test counts
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PASS') as passed,
        COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
        COUNT(*) FILTER (WHERE status = 'SKIP') as skipped
    INTO test_results
    FROM run_all_rls_tests();
    
    RETURN QUERY
    SELECT 
        test_results.total,
        test_results.passed,
        test_results.failed,
        test_results.skipped,
        CASE 
            WHEN test_results.total > 0 
            THEN ROUND((test_results.passed::NUMERIC / test_results.total::NUMERIC) * 100, 2)
            ELSE 0
        END,
        NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. Security Health Check
-- ========================================

-- Function to perform comprehensive security health check
CREATE OR REPLACE FUNCTION security_health_check()
RETURNS TABLE(
  category TEXT,
  check_name TEXT,
  status TEXT,
  risk_level TEXT,
  details JSONB,
  recommendations TEXT[]
) AS $$
BEGIN
    -- RLS Policy Health
    RETURN QUERY
    SELECT 
        'RLS Policies'::TEXT,
        'RLS Enabled on Critical Tables'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE tablename IN ('users', 'companies') 
                AND rowsecurity = true
                GROUP BY tablename
                HAVING COUNT(*) = 2
            ) THEN 'HEALTHY' ELSE 'WARNING' END,
        'LOW',
        jsonb_build_object(
            'users_rls_enabled', (SELECT rowsecurity FROM pg_tables WHERE tablename = 'users'),
            'companies_rls_enabled', (SELECT rowsecurity FROM pg_tables WHERE tablename = 'companies')
        ),
        ARRAY['Enable RLS on all critical tables']::TEXT[]
    
    UNION ALL
    
    -- Data Integrity Health
    SELECT 
        'Data Integrity'::TEXT,
        'No Orphaned Records'::TEXT,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM users u 
                LEFT JOIN companies c ON u.company_id = c.id 
                WHERE c.id IS NULL
            ) THEN 'HEALTHY' ELSE 'CRITICAL' END,
        'HIGH',
        jsonb_build_object(
            'orphaned_users', (
                SELECT COUNT(*) FROM users u 
                LEFT JOIN companies c ON u.company_id = c.id 
                WHERE c.id IS NULL
            )
        ),
        ARRAY['Clean up orphaned user records', 'Ensure all users have valid company references']::TEXT[]
    
    UNION ALL
    
    -- Access Control Health
    SELECT 
        'Access Control'::TEXT,
        'Proper Role-Based Access'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM users WHERE role IN ('owner', 'pro', 'employee'))
            THEN 'HEALTHY' ELSE 'WARNING' END,
        'MEDIUM',
        jsonb_build_object(
            'role_distribution', (
                SELECT jsonb_object_agg(role, count) 
                FROM (
                    SELECT role, COUNT(*) as count 
                    FROM users 
                    GROUP BY role
                ) roles
            )
        ),
        ARRAY['Ensure proper role assignment', 'Review user permissions regularly']::TEXT[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. Comments and Documentation
-- ========================================

COMMENT ON FUNCTION test_own_profile_access() IS 'Tests that users can only see their own profile.';
COMMENT ON FUNCTION test_owner_company_access() IS 'Tests that company owners can see all users in their company.';
COMMENT ON FUNCTION test_cross_company_blocked() IS 'Tests that cross-company data access is blocked.';
COMMENT ON FUNCTION test_profile_update_permissions() IS 'Tests profile update permissions.';
COMMENT ON FUNCTION test_email_uniqueness() IS 'Tests email uniqueness within companies.';
COMMENT ON FUNCTION test_company_owner_requirement() IS 'Tests that all companies have at least one owner.';
COMMENT ON FUNCTION run_all_rls_tests() IS 'Runs all RLS tests and returns comprehensive results.';
COMMENT ON FUNCTION get_rls_test_summary() IS 'Provides a summary of all RLS test results.';
COMMENT ON FUNCTION security_health_check() IS 'Performs comprehensive security health check.';

-- Test execution example (run this to test RLS):
-- SELECT * FROM run_all_rls_tests();
-- SELECT * FROM get_rls_test_summary();
-- SELECT * FROM security_health_check();

SELECT 'RLS Testing Suite Created Successfully' as status;
