-- Fix: handle_new_user() inserted without role; column default was still "member" after the
-- role rename migration, so users_role_check (owner | pro | employee) failed.
--
-- Role rules:
-- * Public /signup (no created_by_owner in auth user_metadata): always owner (first org account).
-- * Owner-invited users (created_by_owner = true in metadata): role + company_id from metadata.

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'employee';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_company_id uuid;
  v_full_name text;
BEGIN
  v_full_name := NULLIF(trim(new.raw_user_meta_data->>'full_name'), '');

  IF coalesce((new.raw_user_meta_data->>'created_by_owner')::boolean, false) THEN
    v_role := lower(coalesce(new.raw_user_meta_data->>'role', 'employee'));
    IF v_role NOT IN ('owner', 'pro', 'employee') THEN
      v_role := 'employee';
    END IF;
    BEGIN
      v_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_company_id := NULL;
    END;
  ELSE
    -- Self-serve signup: first account is owner; company_id set during onboarding / RPC later.
    v_role := 'owner';
    v_company_id := NULL;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    company_id,
    role,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    v_company_id,
    v_role,
    v_full_name,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    role = excluded.role,
    company_id = coalesce(excluded.company_id, public.users.company_id),
    full_name = coalesce(excluded.full_name, public.users.full_name),
    updated_at = now();

  RETURN new;
END;
$$;

-- Recreate trigger so name/definition match Supabase conventions.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
