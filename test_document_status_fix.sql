-- Test script to verify document status calculation fix
-- Run this to test the logic before applying the migration

-- Test the get_document_status function with today's date (2026-04-28)
SELECT 
    'Test Case 1: Today expiry (should be expiring-soon)' as test_case,
    get_document_status('2026-04-28') as result;

SELECT 
    'Test Case 2: Expired yesterday (should be expired)' as test_case,
    get_document_status('2026-04-27') as result;

SELECT 
    'Test Case 3: Expires in 7 days (should be expiring-soon)' as test_case,
    get_document_status('2026-05-05') as result;

SELECT 
    'Test Case 4: Expires in 8 days (should be active)' as test_case,
    get_document_status('2026-05-06') as result;

SELECT 
    'Test Case 5: No expiry date (should be active)' as test_case,
    get_document_status(NULL) as result;

-- Check current documents that need fixing
SELECT 
    id,
    name,
    expiry_date,
    status,
    get_document_status(expiry_date) as correct_status,
    CASE 
        WHEN status != get_document_status(expiry_date) AND status != 'complete' 
        THEN 'NEEDS FIX'
        ELSE 'OK'
    END as status_check
FROM documents 
ORDER BY expiry_date;
