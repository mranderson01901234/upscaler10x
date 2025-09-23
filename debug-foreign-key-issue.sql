-- Debug Foreign Key Constraint Issue
-- The error suggests 'admin' is not found in subscription_tiers(tier_name)

-- Step 1: Check what tier_names actually exist
SELECT tier_name, id FROM subscription_tiers ORDER BY tier_name;

-- Step 2: Check the foreign key constraint details
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_profiles'
    AND kcu.column_name = 'subscription_tier';

-- Step 3: Test if we can reference 'admin' tier
SELECT 'admin' IN (SELECT tier_name FROM subscription_tiers) AS admin_exists;

-- Step 4: If admin exists, try a simple test update
-- UPDATE user_profiles 
-- SET subscription_tier = 'admin' 
-- WHERE id = 'some-test-uuid'; 