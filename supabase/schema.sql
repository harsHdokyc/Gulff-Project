-- ========================================
-- Compliance Guard Database Schema
-- ========================================
--
-- WHEN TO RUN THIS FILE
-- ----------------------
-- Use ONLY on a brand-new / empty database (local reset, fresh project).
-- If you already have a Supabase project with tables, DO NOT run this whole
-- file in the SQL Editor — you will get: "relation ... already exists" (42P07).
--
-- For an existing database, apply changes via supabase/migrations/*.sql
-- (e.g. incremental ALTER / CREATE OR REPLACE FUNCTION only).
--
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Core Tables
-- ========================================

-- Companies table (multi-tenant base)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  country TEXT NOT NULL DEFAULT 'AE',
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (authentication profiles)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance tasks table
CREATE TABLE compliance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visa_expiry DATE,
  emirates_id_expiry DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warning', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('trade-license', 'vat-certificate', 'insurance', 'lease', 'other')),
  expiry_date DATE,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring-soon', 'expired', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'danger')),
  channel TEXT NOT NULL CHECK (channel IN ('in-app', 'email', 'whatsapp')),
  read BOOLEAN DEFAULT FALSE,
  task_id UUID REFERENCES compliance_tasks(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Indexes for Performance
-- ========================================

CREATE INDEX idx_companies_country ON companies(country);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_compliance_tasks_company_id ON compliance_tasks(company_id);
CREATE INDEX idx_compliance_tasks_due_date ON compliance_tasks(due_date);
CREATE INDEX idx_compliance_tasks_status ON compliance_tasks(status);
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies
-- ========================================

-- Companies: Users can only see their own company
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own company" ON companies
  FOR UPDATE USING (id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Users: Company members can view all users in their company
CREATE POLICY "Company members can view users" ON users
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Compliance Tasks: Company members can manage their tasks
CREATE POLICY "Company members can view tasks" ON compliance_tasks
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can insert tasks" ON compliance_tasks
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can update tasks" ON compliance_tasks
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can delete tasks" ON compliance_tasks
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Employees: Company members can manage employees
CREATE POLICY "Company members can view employees" ON employees
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can insert employees" ON employees
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can update employees" ON employees
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can delete employees" ON employees
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Documents: Company members can manage documents
CREATE POLICY "Company members can view documents" ON documents
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can insert documents" ON documents
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can update documents" ON documents
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can delete documents" ON documents
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Notifications: Users can only manage their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- Triggers for Updated Timestamps
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_tasks_updated_at BEFORE UPDATE ON compliance_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Functions for Business Logic
-- ========================================

-- Function to get user's company ID
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate employee status
CREATE OR REPLACE FUNCTION get_employee_status(visa_expiry DATE, emirates_id_expiry DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN visa_expiry IS NULL AND emirates_id_expiry IS NULL THEN 'active'
    WHEN visa_expiry IS NOT NULL AND emirates_id_expiry IS NOT NULL THEN
      CASE 
        WHEN LEAST(visa_expiry, emirates_id_expiry) < CURRENT_DATE THEN 'expired'
        WHEN LEAST(visa_expiry, emirates_id_expiry) <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'active'
      END
    WHEN visa_expiry IS NOT NULL THEN
      CASE 
        WHEN visa_expiry < CURRENT_DATE THEN 'expired'
        WHEN visa_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'active'
      END
    WHEN emirates_id_expiry IS NOT NULL THEN
      CASE 
        WHEN emirates_id_expiry < CURRENT_DATE THEN 'expired'
        WHEN emirates_id_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'active'
      END
    ELSE 'active'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate document status
CREATE OR REPLACE FUNCTION get_document_status(expiry_date DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN expiry_date IS NULL THEN 'active'
    WHEN expiry_date < CURRENT_DATE THEN 'expired'
    WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring-soon'
    ELSE 'active'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update overdue tasks
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS VOID AS $$
BEGIN
  UPDATE compliance_tasks 
  SET status = 'overdue' 
  WHERE due_date < CURRENT_DATE AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- Function to update employee statuses
CREATE OR REPLACE FUNCTION update_employee_statuses()
RETURNS VOID AS $$
BEGIN
  UPDATE employees 
  SET status = get_employee_status(visa_expiry, emirates_id_expiry)
  WHERE status != get_employee_status(visa_expiry, emirates_id_expiry);
END;
$$ LANGUAGE plpgsql;

-- Function to update document statuses
CREATE OR REPLACE FUNCTION update_document_statuses()
RETURNS VOID AS $$
BEGIN
  UPDATE documents 
  SET status = get_document_status(expiry_date)
  WHERE status <> 'complete'
    AND status IS DISTINCT FROM get_document_status(expiry_date);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Design Decisions & Notes
-- ========================================

/*
1. Multi-tenant Architecture: All tables reference company_id for data isolation
2. UUID Primary Keys: Prevents enumeration attacks and provides better performance
3. Function-Based Status: Dynamic status calculation via database functions (immutable approach)
4. RLS Policies: Principle of least privilege - users only access their company data
5. Indexes: Optimized for common query patterns (company_id, dates, status)
6. Constraints: CHECK constraints ensure data integrity
7. Timestamps: Created/updated timestamps for auditing and debugging
8. Foreign Keys: CASCADE deletes maintain data consistency
9. Security: All policies use auth.uid() for user-based access control
10. Scalability: Schema supports future features without major restructuring
11. Status Management: Automated status updates via scheduled functions
*/
