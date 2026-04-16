-- ========================================
-- Fix User Synchronization Issue
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. First, check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if the function exists
SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Drop and recreate the function (more robust version)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user into our users table if not exists
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (new.id, new.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create a function to sync existing users
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS INTEGER AS $$
DECLARE
    synced_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Sync users that exist in auth.users but not in our users table
    FOR user_record IN 
        SELECT au.id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN public.users u ON au.id = u.id
        WHERE u.id IS NULL
    LOOP
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (user_record.id, user_record.email, user_record.created_at, NOW())
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS synced_count = ROW_COUNT;
    END LOOP;
    
    RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_existing_auth_users TO authenticated;

-- 7. Run the sync for existing users
SELECT sync_existing_auth_users() as users_synced;

-- 8. Verify the setup
SELECT 'User synchronization setup completed' as status;

-- 9. Test query to check for any users still missing from our table
SELECT 
    COUNT(*) as missing_users_count
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;
