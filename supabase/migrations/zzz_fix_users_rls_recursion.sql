-- Fix 42P17: infinite recursion on public.users RLS
--
-- Root cause: any policy expression that reads public.users while evaluating access to
-- public.users causes re-entrant RLS (SET LOCAL row_security is not reliable here on
-- Supabase). Fix: mirror company_id + role into user_membership_ctx (one row per user),
-- maintained by triggers. Policies and helpers read ONLY user_membership_ctx — never users.

-- -----------------------------------------------------------------------------
-- 1) Mirror table (RLS: each user may read only their own row — no reference to users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_membership_ctx (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  company_id uuid,
  role text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_membership_ctx ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own membership ctx" ON public.user_membership_ctx;
CREATE POLICY "Users read own membership ctx" ON public.user_membership_ctx
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_membership_ctx_company ON public.user_membership_ctx (company_id);

-- -----------------------------------------------------------------------------
-- 2) Keep mirror in sync (runs as trigger owner — inserts bypass RLS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_membership_ctx()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_membership_ctx WHERE user_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.user_membership_ctx (user_id, company_id, role, updated_at)
  VALUES (NEW.id, NEW.company_id, NEW.role, now())
  ON CONFLICT (user_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    role = EXCLUDED.role,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_sync_membership_ctx ON public.users;
CREATE TRIGGER trg_users_sync_membership_ctx
  AFTER INSERT OR UPDATE OF company_id, role OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_user_membership_ctx();

ALTER FUNCTION public.sync_user_membership_ctx() OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 3) Backfill from existing profiles
-- -----------------------------------------------------------------------------
INSERT INTO public.user_membership_ctx (user_id, company_id, role, updated_at)
SELECT id, company_id, role, now()
FROM public.users
ON CONFLICT (user_id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  role = EXCLUDED.role,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 4) Helpers — read mirror only (STABLE; no SET, no touch of public.users)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_auth_membership()
RETURNS TABLE(company_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.company_id, c.role
  FROM public.user_membership_ctx c
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.rls_auth_user_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_membership_ctx c WHERE c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_membership_ctx c
    WHERE c.user_id = auth.uid() AND c.role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_pro_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_membership_ctx c
    WHERE c.user_id = auth.uid() AND c.role = 'pro'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.company_id FROM public.user_membership_ctx c WHERE c.user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.rls_auth_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auth_user_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;

ALTER FUNCTION public.rls_auth_membership() OWNER TO postgres;
ALTER FUNCTION public.rls_auth_user_exists() OWNER TO postgres;
ALTER FUNCTION public.is_company_owner() OWNER TO postgres;
ALTER FUNCTION public.is_pro_user() OWNER TO postgres;
ALTER FUNCTION public.get_current_company_id() OWNER TO postgres;

GRANT SELECT ON public.user_membership_ctx TO authenticated;

-- -----------------------------------------------------------------------------
-- 5) Self-update guard (unchanged behaviour)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_self_users_row_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND NEW.id = auth.uid()
  THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change your own role';
    END IF;
    IF OLD.company_id IS NOT NULL AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Cannot change your company assignment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_self_users_row_update_trigger ON public.users;
CREATE TRIGGER enforce_self_users_row_update_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_self_users_row_update();

ALTER FUNCTION public.enforce_self_users_row_update() OWNER TO postgres;

-- -----------------------------------------------------------------------------
-- 6) users policies — expressions only use rls_* helpers (which read ctx, not users)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND (
      NOT public.rls_auth_user_exists()
      OR company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Company owners can view all users" ON public.users;
CREATE POLICY "Company owners can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rls_auth_membership() r WHERE r.role = 'owner')
    AND company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  );

DROP POLICY IF EXISTS "Company owners can manage users" ON public.users;
CREATE POLICY "Company owners can manage users" ON public.users
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.rls_auth_membership() r WHERE r.role = 'owner')
    AND company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rls_auth_membership() r WHERE r.role = 'owner')
    AND company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  );

DROP POLICY IF EXISTS "PROs can view company users" ON public.users;
CREATE POLICY "PROs can view company users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rls_auth_membership() r WHERE r.role = 'pro')
    AND company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  );

DROP POLICY IF EXISTS "Company members can view active users" ON public.users;
CREATE POLICY "Company members can view active users" ON public.users
  FOR SELECT USING (
    company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
    AND COALESCE(status, 'active') = 'active'
  );

-- -----------------------------------------------------------------------------
-- 7) companies + audit (helpers read ctx only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (
    id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  );

DROP POLICY IF EXISTS "Company owners can update company" ON public.companies;
CREATE POLICY "Company owners can update company" ON public.companies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.rls_auth_membership() r WHERE r.role = 'owner')
    AND id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rls_auth_membership() r WHERE r.role = 'owner')
    AND id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
  );

DO $$
BEGIN
  IF to_regclass('public.user_management_audit') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own company audit logs" ON public.user_management_audit';
    EXECUTE $p$
      CREATE POLICY "Users can view own company audit logs" ON public.user_management_audit
        FOR SELECT USING (
          company_id IS NOT DISTINCT FROM (SELECT r.company_id FROM public.rls_auth_membership() r LIMIT 1)
        )
    $p$;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8) Drop legacy policies still present in many Supabase projects (not from this repo).
--    They duplicate "owners manage" / broad SELECT/UPDATE and often subquery users → 42P17.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Company owners can manage users with validation" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.users;
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
