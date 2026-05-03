-- Quick Fix for Document Status Issues
-- Run this in Supabase SQL Editor to complete the fix

-- 1. Enable RLS on documents table (CRITICAL SECURITY FIX)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 2. Create proper RLS policies for documents table
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own company documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can update own company documents" ON documents;
DROP POLICY IF EXISTS "Company owners can manage documents" ON documents;

-- Create new policies
CREATE POLICY "Users can view own company documents" ON documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company documents" ON documents
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
    AND status != 'complete'
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
    AND status != 'complete'
  );

CREATE POLICY "Company owners can manage documents" ON documents
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

-- 3. Ensure document status function is correct
CREATE OR REPLACE FUNCTION get_document_status(expiry_date DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN expiry_date IS NULL THEN 'active'
    WHEN expiry_date < CURRENT_DATE THEN 'expired'
    WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring-soon'
    ELSE 'active'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create triggers for automatic status updates
DROP TRIGGER IF EXISTS document_insert_status_trigger ON documents;
DROP TRIGGER IF EXISTS document_update_status_trigger ON documents;

CREATE OR REPLACE FUNCTION update_document_status_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status != 'complete' THEN
    NEW.status := get_document_status(NEW.expiry_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_document_status_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'complete' AND (NEW.expiry_date IS DISTINCT FROM OLD.expiry_date) THEN
    NEW.status := get_document_status(NEW.expiry_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_insert_status_trigger
  BEFORE INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_status_on_insert();

CREATE TRIGGER document_update_status_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_status_on_update();

-- 5. Final verification
SELECT 'Document Status Fix Complete' as status, CURRENT_TIMESTAMP as completed_at;
