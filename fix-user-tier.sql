-- Fix user tier for dparker918@yahoo.com
-- This script directly updates the user profile to Pro tier

-- First, let's see the current state
SELECT id, email, user_metadata, app_metadata 
FROM auth.users 
WHERE email = 'dparker918@yahoo.com';

-- Check current profile
SELECT * FROM user_profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'dparker918@yahoo.com'
);

-- Update user to Pro tier in user_profiles table
UPDATE user_profiles 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'dparker918@yahoo.com'
);

-- Also update the auth.users metadata to include tier information
UPDATE auth.users 
SET 
  user_metadata = COALESCE(user_metadata, '{}'::jsonb) || '{"tier": "pro"}'::jsonb,
  app_metadata = COALESCE(app_metadata, '{}'::jsonb) || '{"tier": "pro", "subscription_tier": "pro"}'::jsonb,
  updated_at = NOW()
WHERE email = 'dparker918@yahoo.com';

-- Verify the changes
SELECT 'Updated user:' as result;
SELECT id, email, user_metadata, app_metadata 
FROM auth.users 
WHERE email = 'dparker918@yahoo.com';

SELECT 'Updated profile:' as result;
SELECT * FROM user_profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'dparker918@yahoo.com'
); 