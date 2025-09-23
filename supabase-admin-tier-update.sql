-- Admin Tier Implementation for Pro Upscaler
-- Run this in your Supabase SQL editor to add admin tier support

-- Add admin tier to subscription_tiers table
INSERT INTO subscription_tiers (tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) VALUES 
('admin', -1, -1, -1, 0.00) 
ON CONFLICT (tier_name) DO UPDATE SET
    max_2x_4x = -1,
    max_8x = -1,
    max_ai_enhancements = -1,
    price_monthly = 0.00;

-- Verify the admin tier was added
SELECT * FROM subscription_tiers ORDER BY 
    CASE tier_name 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'pro' THEN 3 
        WHEN 'admin' THEN 4 
        ELSE 5 
    END;

-- Optional: Create a test admin user (replace with actual email)
-- UPDATE user_profiles SET subscription_tier = 'admin' WHERE id = (
--     SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1
-- ); 