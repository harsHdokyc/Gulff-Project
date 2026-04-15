# Supabase Migration Guide

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project created and configured
- Local development environment set up

## Migration Steps

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Your Project
```bash
supabase link --project-ref idryuttsllvtlcdhlelk
```

### 4. Apply Schema to Local Development
```bash
# Create migration file
supabase migration new initial_schema

# Apply schema to local dev
supabase db push
```

### 5. Push to Production
```bash
# Deploy to production
supabase db push
```

## Alternative: Direct SQL Execution

### Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/idryuttsllvtlcdhlelk
2. Navigate to SQL Editor
3. Copy and paste the entire schema.sql content
4. Execute the SQL

### Via CLI (Single Command)
```bash
supabase db reset --schema supabase/schema.sql
```

## Post-Migration Setup

### 1. Enable Extensions
```sql
-- Already included in schema, but verify:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Set Up Auth
- Configure email templates in Supabase Dashboard
- Set up redirect URLs for your app
- Configure JWT settings

### 3. Storage Setup
```sql
-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);
```

### 4. Test RLS Policies
```sql
-- Verify policies are active
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## Verification Commands

### Check Tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Check RLS Status
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Check Indexes
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```

## Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure RLS policies are correctly applied
2. **UUID Generation**: Verify uuid-ossp extension is enabled
3. **Foreign Key Constraints**: Check table creation order
4. **Connection Issues**: Verify project linking and authentication

### Reset Everything
```bash
supabase db reset
supabase db push
```

## Environment Variables for Production
```bash
# Add to your production environment
VITE_SUPABASE_URL=https://idryuttsllvtlcdhlelk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_eHyTe1mk8XUV37PyusEakQ_zHeOlIxg
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Next Steps After Migration
1. Test authentication flow
2. Verify RLS policies work correctly
3. Set up storage buckets
4. Configure Edge Functions for notifications
5. Test real-time subscriptions
