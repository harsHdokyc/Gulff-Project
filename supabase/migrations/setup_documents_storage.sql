-- Documents Storage Setup
-- Run this in Supabase SQL Editor to set up document storage

-- 1. Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf'] -- Only PDF files allowed
) ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- Users can upload to documents bucket
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Users can view their company's documents
CREATE POLICY "Users can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Users can update their company's documents
CREATE POLICY "Users can update documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Users can delete their company's documents
CREATE POLICY "Users can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );
