-- Fix: signup returns "Database error saving new user"
--
-- Root causes addressed:
-- 1) Policy "Users can insert own profile" required an existing users row to read company_id,
--    which is impossible on the very first INSERT (chicken-and-egg).
-- 2) Auth/GoTrue triggers run as supabase_auth_admin without JWT claims; policies that only
--    rely on auth.uid() do not allow those inserts.
-- 3) If handle_new_user() creates a companies row first, companies had no INSERT policy.
--
-- Filename prefix "zzz_" keeps this after user_management_rls_policies.sql when migrations
-- are applied in lexicographic order.

-- -----------------------------------------------------------------------------
-- public.users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Signed-in clients: first profile row for this auth user, or row matching existing company.
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND (
      NOT EXISTS (SELECT 1 FROM public.users existing WHERE existing.id = auth.uid())
      OR company_id IS NOT DISTINCT FROM (
        SELECT u.company_id FROM public.users u WHERE u.id = auth.uid() LIMIT 1
      )
    )
  );

-- Internal signup path (trigger on auth.users): no JWT context (Supabase hosted only).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Supabase auth admin can insert users on signup" ON public.users';
    EXECUTE $policy$
      CREATE POLICY "Supabase auth admin can insert users on signup" ON public.users
        FOR INSERT TO supabase_auth_admin WITH CHECK (true)
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "Supabase auth admin can insert companies on signup" ON public.companies';
    EXECUTE $policy$
      CREATE POLICY "Supabase auth admin can insert companies on signup" ON public.companies
        FOR INSERT TO supabase_auth_admin WITH CHECK (true)
    $policy$;

    IF to_regclass('public.user_management_audit') IS NOT NULL THEN
      EXECUTE 'DROP POLICY IF EXISTS "Supabase auth admin can insert user management audit" ON public.user_management_audit';
      EXECUTE $policy$
        CREATE POLICY "Supabase auth admin can insert user management audit" ON public.user_management_audit
          FOR INSERT TO supabase_auth_admin WITH CHECK (true)
      $policy$;
    END IF;
  END IF;
END $$;
