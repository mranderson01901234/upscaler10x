-- Upgrade dparker918@yahoo.com to Pro Tier
-- This will give them full access to Pro Engine and AI features

-- First, let's verify the user exists
SELECT id, email FROM auth.users WHERE email = 'dparker918@yahoo.com';

-- Update the user to pro tier
UPDATE user_profiles 
SET subscription_tier = 'pro' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'dparker918@yahoo.com' 
    LIMIT 1
);

-- Verify the upgrade worked
SELECT 
    u.email,
    p.subscription_tier,
    p.subscription_status,
    p.created_at
FROM auth.users u
JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'dparker918@yahoo.com'; 