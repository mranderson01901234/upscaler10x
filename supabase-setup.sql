-- Pro Upscaler Supabase Database Setup
-- Run these commands in your Supabase SQL editor

-- Create subscription tiers lookup table
CREATE TABLE subscription_tiers (
    tier_name TEXT PRIMARY KEY,
    max_2x_4x INTEGER, -- -1 for unlimited
    max_8x INTEGER,    -- -1 for unlimited
    max_ai_enhancements INTEGER, -- -1 for unlimited
    price_monthly DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert tier definitions
INSERT INTO subscription_tiers (tier_name, max_2x_4x, max_8x, max_ai_enhancements, price_monthly) VALUES 
('free', -1, 0, 3, 0.00),
('basic', -1, -1, 10, 9.99),
('pro', -1, -1, -1, 19.99);

-- If tiers already exist, ensure free tier matches new policy
UPDATE subscription_tiers
SET max_2x_4x = -1, max_8x = 0, max_ai_enhancements = 3
WHERE tier_name = 'free';

-- Create user profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    subscription_tier TEXT REFERENCES subscription_tiers(tier_name) DEFAULT 'free',
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage logs table
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    processing_type TEXT NOT NULL, -- 'standard', 'highres', 'ai_enhancement'
    scale_factor TEXT, -- '2x', '4x', '8x', '12x', '15x'
    image_pixels INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monthly usage summary view
CREATE OR REPLACE VIEW monthly_usage AS
SELECT 
    user_id,
    DATE_TRUNC('month', created_at) as month,
    processing_type,
    COUNT(*) as usage_count,
    SUM(processing_time_ms) as total_processing_time
FROM usage_logs 
GROUP BY user_id, DATE_TRUNC('month', created_at), processing_type;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own usage logs" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs" ON usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, subscription_tier)
    VALUES (NEW.id, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
    user_uuid UUID,
    processing_type_param TEXT
)
RETURNS TABLE(allowed BOOLEAN, current_usage INTEGER, limit_value INTEGER, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_tier TEXT;
    tier_limit INTEGER;
    current_month_usage INTEGER;
BEGIN
    -- Get user's subscription tier
    SELECT subscription_tier INTO user_tier
    FROM user_profiles
    WHERE id = user_uuid;
    
    -- Get the limit for this tier and processing type
    SELECT 
        CASE 
            WHEN processing_type_param = 'standard' THEN max_2x_4x
            WHEN processing_type_param = 'highres' THEN max_8x
            WHEN processing_type_param = 'ai_enhancement' THEN max_ai_enhancements
        END INTO tier_limit
    FROM subscription_tiers
    WHERE tier_name = user_tier;
    
    -- If unlimited (-1), allow
    IF tier_limit = -1 THEN
        RETURN QUERY SELECT true, 0, -1, 'unlimited'::TEXT;
        RETURN;
    END IF;
    
    -- Get current month usage
    SELECT COALESCE(usage_count, 0) INTO current_month_usage
    FROM monthly_usage
    WHERE user_id = user_uuid 
        AND month = DATE_TRUNC('month', NOW())
        AND processing_type = processing_type_param;
    
    -- Check if under limit
    IF current_month_usage < tier_limit THEN
        RETURN QUERY SELECT true, current_month_usage, tier_limit, 'within_limit'::TEXT;
    ELSE
        RETURN QUERY SELECT false, current_month_usage, tier_limit, 'limit_exceeded'::TEXT;
    END IF;
END;
$$; 