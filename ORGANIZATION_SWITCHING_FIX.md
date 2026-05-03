# Organization Switching Fix

## Problem Description

PRO users were experiencing incorrect task counts when switching between organizations:

- **LPU Organization**: Has 11 tasks, but only showed 3
- **Hexa LTD Organization**: Has 1 task, but still showed 3 (same as LPU)

## Root Cause Analysis

The issue was caused by **Row Level Security (RLS) policies** that didn't properly respect organization context for PRO users. The existing policies allowed PRO users to see tasks from ALL their associated organizations regardless of the current organization context.

### Key Issues Identified:

1. **RLS Policy Conflict**: The `compliance_tasks` RLS policy had logic that bypassed organization filtering for PRO users
2. **Missing Organization Context**: No mechanism to pass organization context to the database session
3. **Cache Key Issues**: React Query cache keys didn't include organization ID, causing cross-organization data contamination

## Solution Overview

The fix implements a comprehensive solution with three main components:

### 1. Database Layer Changes

#### New RLS Policy (`fix_organization_task_filtering.sql`)
- **Respects Organization Context**: When `app.organization_id` is set, only shows tasks from that organization
- **Fallback Behavior**: When no context is provided, shows tasks from all associated organizations (for non-org routes)
- **Security Maintained**: PRO users can only access organizations they're associated with

#### Organization Context Functions (`create_organization_context_function.sql`)
- `set_organization_context(org_id)`: Sets organization context for the current database session
- `clear_organization_context()`: Clears the organization context

### 2. Service Layer Changes

#### Updated Task Service (`dashboardTasks.ts`)
- **Context Management**: Sets/clears organization context for each query
- **Error Handling**: Gracefully handles context clearing failures
- **Consistent Behavior**: Ensures no context bleeding between queries

### 3. Query Layer Changes

#### Updated React Query Hooks (`useDashboardTasksQuery.ts`)
- **Organization-Specific Cache Keys**: Each organization has separate cache entries
- **Proper Invalidation**: Mutations only invalidate the current organization's cache
- **Subscription Handling**: Real-time updates respect organization context

## Implementation Steps

### Step 1: Apply Database Migrations

Run these migrations in order:

```sql
-- 1. Create organization context functions
-- File: create_organization_context_function.sql
-- This creates the set/clear context functions

-- 2. Update RLS policies  
-- File: fix_organization_task_filtering.sql
-- This updates the compliance_tasks RLS policies
```

### Step 2: Update Application Code

The following files have been updated:

1. **`src/modules/dashboard/services/dashboardTasks.ts`**
   - Added organization context management
   - Updated `getTasks()` and `createTask()` methods

2. **`src/modules/dashboard/hooks/useDashboardTasksQuery.ts`**
   - Updated query keys to include organization ID
   - Fixed cache invalidation for mutations

### Step 3: Testing

Run the test suite to verify the fix:

```bash
npm test -- organization-task-filtering.test.ts
```

## Technical Details

### Database Session Variables

The solution uses PostgreSQL's `set_config()` function to create session-specific variables:

```sql
SET app.organization_id = 'your-org-uuid';
```

This variable is then checked in RLS policies to determine which organization's data to return.

### Cache Key Strategy

React Query keys now include organization ID:

```typescript
// Before: ['tasks', 'list']
// After:  ['tasks', 'list', { organizationId: 'org-123' }]
```

This ensures:
- Separate cache entries per organization
- No cross-organization data contamination
- Proper cache invalidation

### Error Handling

The solution includes robust error handling:
- Context clearing failures don't crash the app
- Database errors are properly logged
- Graceful fallbacks for edge cases

## Verification

After applying the fix:

1. **Switch to LPU Organization**: Should show exactly 11 tasks
2. **Switch to Hexa LTD Organization**: Should show exactly 1 task  
3. **Switch back to LPU**: Should still show 11 tasks (no cache contamination)
4. **Create new tasks**: Should only appear in the current organization
5. **Real-time updates**: Should only affect the current organization

## Performance Considerations

- **Minimal Overhead**: Context setting/clearing is very fast
- **Better Caching**: Organization-specific cache improves performance
- **Reduced Data Transfer**: Only relevant organization data is fetched

## Security Considerations

- **RLS Maintained**: All security policies remain in effect
- **Context Validation**: PRO users can only set context for organizations they have access to
- **No Privilege Escalation**: Users cannot access organizations they're not associated with

## Troubleshooting

### Issues and Solutions

1. **Still seeing wrong task counts**
   - Verify migrations were applied correctly
   - Check browser cache (hard refresh)
   - Verify organization ID in URL

2. **Tasks not updating in real-time**
   - Check Supabase Realtime permissions
   - Verify organization context is being set
   - Check browser console for errors

3. **Performance issues**
   - Check if organization context is being cleared properly
   - Monitor database query performance
   - Verify React Query caching behavior

### Debug Commands

```sql
-- Check current organization context
SELECT current_setting('app.organization_id', true);

-- Check RLS policy effectiveness
SELECT * FROM compliance_tasks WHERE company_id = 'your-org-id';
```

## Future Improvements

1. **Automatic Context Setting**: Could be implemented at the router level
2. **Context Validation**: Additional checks for organization access
3. **Performance Monitoring**: Metrics for context switching performance
4. **Better Error Messages**: User-friendly error messages for access issues

## Files Modified

- `supabase/migrations/fix_organization_task_filtering.sql` (NEW)
- `supabase/migrations/create_organization_context_function.sql` (NEW)
- `src/modules/dashboard/services/dashboardTasks.ts` (MODIFIED)
- `src/modules/dashboard/hooks/useDashboardTasksQuery.ts` (MODIFIED)
- `src/test/organization-task-filtering.test.ts` (NEW)

## Summary

This fix resolves the organization switching issue by implementing proper organization context management at the database, service, and query layers. The solution is secure, performant, and maintains backward compatibility while providing the correct task counts for each organization.
