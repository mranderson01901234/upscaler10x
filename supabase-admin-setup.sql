-- Pro Upscaler Admin Role Management Setup
-- Run these commands in your Supabase SQL editor

-- Add admin role columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN admin_role TEXT DEFAULT NULL,
ADD COLUMN admin_permissions TEXT[] DEFAULT NULL,
ADD COLUMN admin_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN admin_created_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create admin role enum type
CREATE TYPE admin_role_enum AS ENUM (
    'super_admin',      -- Full system access
    'customer_support', -- User management and support  
    'billing_admin',    -- Billing and subscription management
    'technical_admin'   -- System monitoring and maintenance
);

-- Update admin_role column to use enum
ALTER TABLE user_profiles 
ALTER COLUMN admin_role TYPE admin_role_enum USING admin_role::admin_role_enum;

-- Create admin permissions lookup table
CREATE TABLE admin_permissions (
    permission_name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'user_management', 'billing', 'system', 'analytics', 'support'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert permission definitions
INSERT INTO admin_permissions (permission_name, description, category) VALUES
-- User Management
('user_management.view', 'View user profiles and information', 'user_management'),
('user_management.edit', 'Edit user profiles and settings', 'user_management'),
('user_management.suspend', 'Suspend/unsuspend user accounts', 'user_management'),
('user_management.delete', 'Delete user accounts', 'user_management'),

-- Billing Management
('billing.view', 'View billing information and transactions', 'billing'),
('billing.edit', 'Modify subscriptions and billing', 'billing'),
('billing.refunds', 'Process refunds and adjustments', 'billing'),
('billing.reports', 'Generate billing reports', 'billing'),

-- System Management
('system.monitoring', 'View system health and monitoring', 'system'),
('system.maintenance', 'Perform system maintenance tasks', 'system'),
('system.logs', 'Access system logs and debugging', 'system'),
('system.config', 'Modify system configuration', 'system'),

-- Analytics
('analytics.view', 'View business analytics and reports', 'analytics'),
('analytics.export', 'Export analytics data', 'analytics'),
('analytics.advanced', 'Access advanced analytics features', 'analytics'),

-- Support
('support.tickets', 'Manage customer support tickets', 'support'),
('support.communications', 'Send communications to users', 'support'),
('support.escalation', 'Handle escalated support issues', 'support');

-- Create admin role permission mappings
CREATE TABLE admin_role_permissions (
    role_name admin_role_enum NOT NULL,
    permission_name TEXT REFERENCES admin_permissions(permission_name),
    PRIMARY KEY (role_name, permission_name)
);

-- Define permission sets for each role
INSERT INTO admin_role_permissions (role_name, permission_name) VALUES
-- Super Admin (all permissions)
('super_admin', 'user_management.view'),
('super_admin', 'user_management.edit'),
('super_admin', 'user_management.suspend'),
('super_admin', 'user_management.delete'),
('super_admin', 'billing.view'),
('super_admin', 'billing.edit'),
('super_admin', 'billing.refunds'),
('super_admin', 'billing.reports'),
('super_admin', 'system.monitoring'),
('super_admin', 'system.maintenance'),
('super_admin', 'system.logs'),
('super_admin', 'system.config'),
('super_admin', 'analytics.view'),
('super_admin', 'analytics.export'),
('super_admin', 'analytics.advanced'),
('super_admin', 'support.tickets'),
('super_admin', 'support.communications'),
('super_admin', 'support.escalation'),

-- Customer Support
('customer_support', 'user_management.view'),
('customer_support', 'user_management.edit'),
('customer_support', 'user_management.suspend'),
('customer_support', 'billing.view'),
('customer_support', 'support.tickets'),
('customer_support', 'support.communications'),
('customer_support', 'support.escalation'),

-- Billing Admin
('billing_admin', 'user_management.view'),
('billing_admin', 'billing.view'),
('billing_admin', 'billing.edit'),
('billing_admin', 'billing.refunds'),
('billing_admin', 'billing.reports'),
('billing_admin', 'analytics.view'),
('billing_admin', 'analytics.export'),

-- Technical Admin
('technical_admin', 'system.monitoring'),
('technical_admin', 'system.maintenance'),
('technical_admin', 'system.logs'),
('technical_admin', 'system.config'),
('technical_admin', 'analytics.view'),
('technical_admin', 'user_management.view');

-- Create admin audit log table
CREATE TABLE admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create business metrics view
CREATE OR REPLACE VIEW business_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(*) as total_processing_jobs,
    COUNT(*) FILTER (WHERE processing_type = 'ai_enhancement') as ai_enhancement_jobs,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(image_pixels) as total_pixels_processed
FROM usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create subscription analytics view  
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
    subscription_tier,
    COUNT(*) as user_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days') as active_users_7d
FROM user_profiles
GROUP BY subscription_tier;

-- Function to check admin permissions
CREATE OR REPLACE FUNCTION check_admin_permission(
    user_uuid UUID,
    permission_name_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_admin_role admin_role_enum;
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Get user's admin role
    SELECT admin_role INTO user_admin_role
    FROM user_profiles
    WHERE id = user_uuid;
    
    -- If no admin role, return false
    IF user_admin_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if role has this permission
    SELECT EXISTS(
        SELECT 1 FROM admin_role_permissions 
        WHERE role_name = user_admin_role 
        AND permission_name = permission_name_param
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    admin_user_uuid UUID,
    action_param TEXT,
    target_user_uuid UUID DEFAULT NULL,
    details_param JSONB DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO admin_audit_log (
        admin_user_id,
        action,
        target_user_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        admin_user_uuid,
        action_param,
        target_user_uuid,
        details_param,
        ip_address_param,
        user_agent_param
    );
END;
$$;

-- Enable RLS on admin tables
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin tables
CREATE POLICY "Super admins can view all audit logs" ON admin_audit_log
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND admin_role = 'super_admin'
        )
    );

CREATE POLICY "Admins can view their own audit logs" ON admin_audit_log
    FOR SELECT USING (admin_user_id = auth.uid());

-- Create system health monitoring table
CREATE TABLE system_health_log (
    id SERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'
    response_time_ms INTEGER,
    error_message TEXT,
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_system_health_log_created_at ON system_health_log(created_at);
CREATE INDEX idx_system_health_log_service_status ON system_health_log(service_name, status);
CREATE INDEX idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- Grant permissions to service role (for API access)
GRANT SELECT, INSERT, UPDATE ON user_profiles TO service_role;
GRANT SELECT ON admin_permissions TO service_role;
GRANT SELECT ON admin_role_permissions TO service_role;
GRANT SELECT, INSERT ON admin_audit_log TO service_role;
GRANT SELECT, INSERT ON system_health_log TO service_role;
GRANT SELECT ON business_metrics TO service_role;
GRANT SELECT ON subscription_analytics TO service_role; 