-- CORRECTED Admin Tier Implementation for Pro Upscaler
-- This fixes the ON CONFLICT error by using the correct primary key

-- Method 1: Simple INSERT with proper conflict handling
INSERT INTO subscription_tiers (tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) VALUES 
('admin', -1, -1, -1, 0.00) 
ON CONFLICT (tier_name) DO UPDATE SET
    max_2x_4x = EXCLUDED.max_2x_4x,
    max_8x = EXCLUDED.max_8x,
    max_ai_enhancements = EXCLUDED.max_ai_enhancements,
    price_monthly = EXCLUDED.price_monthly;

-- Method 2: Alternative approach using DO block (if Method 1 still fails)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM subscription_tiers WHERE tier_name = 'admin') THEN
--         INSERT INTO subscription_tiers (tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
--         VALUES ('admin', -1, -1, -1, 0.00);
--     ELSE
--         UPDATE subscription_tiers 
--         SET max_2x_4x = -1, max_8x = -1, max_ai_enhancements = -1, price_monthly = 0.00
--         WHERE tier_name = 'admin';
--     END IF;
-- END $$;

-- Verify the admin tier was added
SELECT tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly 
FROM subscription_tiers 
ORDER BY 
    CASE tier_name 
        WHEN 'free' THEN 1 
        WHEN 'basic' THEN 2 
        WHEN 'pro' THEN 3 
        WHEN 'admin' THEN 4 
        ELSE 5 
    END;

-- Optional: Create a test admin user (uncomment and replace email)
-- UPDATE user_profiles 
-- SET subscription_tier = 'admin' 
-- WHERE id = (
--     SELECT id FROM auth.users 
--     WHERE email = 'your-admin@example.com' 
--     LIMIT 1
-- ); 