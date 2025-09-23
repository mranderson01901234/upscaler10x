-- FINAL FIX: Admin Tier Implementation
-- This handles the missing ID column and other potential schema changes

-- First, let's see the current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscription_tiers' 
ORDER BY ordinal_position;

-- Method 1: Insert with explicit ID (if id is auto-increment)
INSERT INTO subscription_tiers (tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
VALUES ('admin', -1, -1, -1, 0.00);

-- Method 2: If the above fails, try with explicit ID
-- INSERT INTO subscription_tiers (id, tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
-- VALUES (4, 'admin', -1, -1, -1, 0.00);

-- Method 3: Safe approach - check existing data first
SELECT * FROM subscription_tiers ORDER BY id;

-- If you need to manually specify an ID, use this:
-- INSERT INTO subscription_tiers (id, tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) 
-- SELECT 
--     COALESCE(MAX(id), 0) + 1,
--     'admin', 
--     -1, 
--     -1, 
--     -1, 
--     0.00
-- FROM subscription_tiers; 