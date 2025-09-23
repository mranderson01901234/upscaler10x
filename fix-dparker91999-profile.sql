-- Fix missing user profile for dparker91999@gmail.com
-- This will create the profile if it doesn't exist and set it to Pro tier

-- First, check if the user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'dparker91999@gmail.com';

-- Check if profile exists
SELECT * FROM user_profiles WHERE id = (
    SELECT id FROM auth.users WHERE email = 'dparker91999@gmail.com'
);

-- Create the profile if it doesn't exist (using UPSERT to handle conflicts)
INSERT INTO user_profiles (id, subscription_tier, subscription_status)
SELECT 
    id,
    'pro',
    'active'
FROM auth.users 
WHERE email = 'dparker91999@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
    subscription_tier = 'pro',
    subscription_status = 'active';

-- Verify the fix worked
SELECT 
    u.email,
    p.subscription_tier,
    p.subscription_status,
    p.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'dparker91999@gmail.com'; 