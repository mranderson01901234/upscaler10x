-- Fix missing user profile for dparker918@yahoo.com
-- This will create the profile if it doesn't exist and set it to Pro tier

-- First, check if the user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'dparker918@yahoo.com';

-- Check if profile exists
SELECT * FROM user_profiles WHERE id = (
    SELECT id FROM auth.users WHERE email = 'dparker918@yahoo.com'
);

-- Create the profile if it doesn't exist
INSERT INTO user_profiles (id, subscription_tier, subscription_status)
SELECT 
    id,
    'pro',
    'active'
FROM auth.users 
WHERE email = 'dparker918@yahoo.com'
  AND id NOT IN (SELECT id FROM user_profiles);

-- Alternative: If the profile exists but has wrong tier, update it
UPDATE user_profiles 
SET subscription_tier = 'pro', subscription_status = 'active'
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'dparker918@yahoo.com'
);

-- Verify the fix worked
SELECT 
    u.email,
    p.subscription_tier,
    p.subscription_status,
    p.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'dparker918@yahoo.com'; 