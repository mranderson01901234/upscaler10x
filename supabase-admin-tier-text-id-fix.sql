-- FINAL FIX: Admin Tier with Text ID
-- The ID column is text type, not integer

-- First, let's see what IDs currently exist
SELECT id, tier_name FROM subscription_tiers ORDER BY tier_name;

-- Method 1: Simple insert with text ID
INSERT INTO subscription_tiers (id, tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
VALUES ('4', 'admin', -1, -1, -1, 0.00);

-- Method 2: If '4' is taken, try other IDs
-- INSERT INTO subscription_tiers (id, tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
-- VALUES ('admin', 'admin', -1, -1, -1, 0.00);

-- Method 3: Generate a unique text ID based on existing data
-- INSERT INTO subscription_tiers (id, tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
-- SELECT 
--     'admin-' || EXTRACT(EPOCH FROM NOW())::text,
--     'admin', 
--     -1, 
--     -1, 
--     -1, 
--     0.00;

-- Verify the insert worked
SELECT * FROM subscription_tiers ORDER BY tier_name; 