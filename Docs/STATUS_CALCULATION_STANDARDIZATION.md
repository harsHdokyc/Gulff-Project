# Status Calculation Standardization - 30 Day Rule

## Overview
This document outlines the standardization of status calculation logic across all three modules (Employees, Documents, Tasks) to use a consistent 30-day warning period.

## Changes Made

### 1. Database Migration
**Files:** 
- `supabase/migrations/20250428_standardize_status_calculation_30_days.sql` (initial)
- `supabase/migrations/20250428_remove_warning_soon_status.sql` (cleanup)

#### Updated Functions:
- **`get_document_status()`**: Changed from 7 days to 30 days for 'expiring-soon' status
- **`update_overdue_tasks()`**: Existing function handles automatic overdue status updates
- **Removed**: `get_task_status()`, `update_task_statuses()`, and task-specific triggers (simplified approach)

#### Database Constraints:
- Reverted `compliance_tasks` table constraint to core statuses only: `pending`, `completed`, `overdue`

### 2. Frontend Type Updates
**File:** `src/modules/dashboard/services/dashboardTasks.ts`

#### Interface Updates:
- `Task.status`: Simplified to core statuses only (`'pending' | 'completed' | 'overdue'`)
- `UpdateTaskData.status`: Simplified to core statuses only
- `TaskStats`: Removed `warning_soon` field (back to 4 core fields)

#### Function Updates:
- `getTaskStats()`: Counts only core statuses
- `getTaskAlerts()`: Uses 30-day period for pending tasks, no intermediate status

### 3. UI Component Updates
**Files:** 
- `src/modules/compliance/components/CompliancePage.tsx`
- `src/modules/dashboard/components/DashboardPage.tsx`

#### Status Filter Updates:
- Removed 'warning-soon' from all status filters
- Reverted to core status options: All, Pending, Completed, Overdue

#### Display Updates:
- Removed 'warning-soon' status badge styling
- Simplified status display logic

## Standardized Status Logic

### Employees (No Change - Already 30 Days)
- **`active`**: Both expiry dates > 30 days from today OR both NULL
- **`warning`**: Earliest expiry date ≤ 30 days from today (but not past)
- **`expired`**: Earliest expiry date < today (past due)

### Documents (Changed from 7 to 30 Days)
- **`active`**: No expiry date OR expiry date > 30 days from today
- **`expiring-soon`**: Expiry date ≤ 30 days from today (but not past)
- **`expired`**: Expiry date < today (past due)
- **`complete`**: Manual override (excluded from automatic calculation)

### Tasks (Simplified - Core Statuses Only)
- **`pending`**: Default status for new tasks (shows in dashboard)
- **`overdue`**: Due date < today (past due) - automatically updated by `update_overdue_tasks()`
- **`completed`**: Manual user action

## Priority Order (Consistent Across All Modules)

1. **Critical**: `expired` / `overdue`
2. **Warning**: `warning` / `expiring-soon` 
3. **Normal**: `active` / `pending`
4. **Override**: `complete` / `completed`

## Benefits of Standardization

1. **Consistency**: All modules use the same 30-day warning period
2. **Simplicity**: Removed complex intermediate status for tasks
3. **Predictability**: Users know exactly when to expect warnings
4. **Business Planning**: 30 days provides adequate time for compliance actions
5. **User Experience**: Unified behavior across the application

## Implementation Notes

- Database functions handle automatic status calculations
- Tasks remain `pending` until they become `overdue` or are manually `completed`
- Documents and Employees use 30-day warning periods
- Frontend components use simplified status logic
- Existing data automatically updated during migration

## Testing Considerations

1. Verify all existing documents update to new 30-day calculation
2. Test task status transitions with simplified logic
3. Confirm status filters work correctly in UI
4. Validate task stats and alerts work with core statuses only
5. Ensure high priority tasks show in dashboard (they're now pending)
