-- Migration: Rename user roles from admin/member to pro/employee
-- This migration updates existing user roles to match the new naming convention

-- First, let's see what role values currently exist
-- (This is for debugging - you can run this separately if needed)
-- SELECT DISTINCT role FROM users;

-- Step 1: Remove the existing constraint entirely
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Update existing role values to new names
UPDATE users 
SET role = 'pro' 
WHERE role = 'admin';

UPDATE users 
SET role = 'employee' 
WHERE role = 'member';

-- Step 3: Handle any unexpected role values by setting them to 'employee'
UPDATE users 
SET role = 'employee' 
WHERE role NOT IN ('owner', 'pro', 'employee');

-- Step 4: Add the new constraint with updated role names
ALTER TABLE users 
ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'pro', 'employee'));

-- Add a comment to document the role changes
COMMENT ON COLUMN users.role IS 'User roles: owner (highest), pro (admin), employee (basic access)';

-- Verify the changes (optional - can be removed in production)
SELECT 
    role,
    COUNT(*) as user_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM users 
GROUP BY role 
ORDER BY user_count DESC;
