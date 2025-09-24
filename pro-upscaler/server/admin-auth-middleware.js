/**
 * Admin Authentication Middleware
 * Extends SupabaseAuthMiddleware with admin role-based access control
 */

const { createClient } = require('@supabase/supabase-js');

class AdminAuthMiddleware {
    constructor() {
        this.supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04'
        );
        
        console.log('✅ Admin Authentication Middleware initialized');
    }

    /**
     * Authenticate admin user and check permissions
     */
    authenticateAdmin = (requiredPermission = null) => {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];

                if (!token) {
                    return res.status(401).json({ message: 'Admin access token required' });
                }

                // Verify token with Supabase
                const { data: { user }, error } = await this.supabase.auth.getUser(token);
                
                if (error || !user) {
                    return res.status(403).json({ message: 'Invalid or expired admin token' });
                }

                // Load user profile with admin role
                const { data: profile, error: profileError } = await this.supabase
                    .from('user_profiles')
                    .select(`
                        *,
                        admin_role,
                        admin_permissions,
                        admin_created_at,
                        admin_created_by
                    `)
                    .eq('id', user.id)
                    .single();

                if (profileError || !profile) {
                    return res.status(404).json({ message: 'Admin profile not found' });
                }

                // Check if user has admin role
                if (!profile.admin_role) {
                    return res.status(403).json({ 
                        message: 'Admin access denied', 
                        reason: 'No admin role assigned' 
                    });
                }

                // Check specific permission if required
                if (requiredPermission) {
                    const hasPermission = await this.checkPermission(user.id, requiredPermission);
                    if (!hasPermission) {
                        await this.logAdminAction(
                            user.id,
                            'permission_denied',
                            null,
                            { 
                                required_permission: requiredPermission,
                                user_role: profile.admin_role 
                            },
                            req.ip,
                            req.get('User-Agent')
                        );
                        
                        return res.status(403).json({ 
                            message: 'Insufficient permissions', 
                            required: requiredPermission,
                            role: profile.admin_role
                        });
                    }
                }

                // Attach admin user data to request
                req.admin = {
                    ...user,
                    profile,
                    role: profile.admin_role,
                    permissions: await this.getUserPermissions(user.id)
                };

                next();
            } catch (error) {
                console.error('Admin auth middleware error:', error);
                res.status(500).json({ message: 'Admin authentication error' });
            }
        };
    };

    /**
     * Check if admin user has specific permission
     */
    async checkPermission(userId, permissionName) {
        try {
            const { data, error } = await this.supabase
                .rpc('check_admin_permission', {
                    user_uuid: userId,
                    permission_name_param: permissionName
                });

            if (error) {
                console.error('Permission check error:', error);
                return false;
            }

            return data === true;
        } catch (error) {
            console.error('Permission check failed:', error);
            return false;
        }
    }

    /**
     * Get all permissions for admin user
     */
    async getUserPermissions(userId) {
        try {
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('admin_role')
                .eq('id', userId)
                .single();

            if (!profile?.admin_role) {
                return [];
            }

            const { data: permissions, error } = await this.supabase
                .from('admin_role_permissions')
                .select(`
                    permission_name,
                    admin_permissions(description, category)
                `)
                .eq('role_name', profile.admin_role);

            if (error) {
                console.error('Get permissions error:', error);
                return [];
            }

            return permissions || [];
        } catch (error) {
            console.error('Get user permissions failed:', error);
            return [];
        }
    }

    /**
     * Log admin action for audit trail
     */
    async logAdminAction(adminUserId, action, targetUserId = null, details = null, ipAddress = null, userAgent = null) {
        try {
            await this.supabase
                .rpc('log_admin_action', {
                    admin_user_uuid: adminUserId,
                    action_param: action,
                    target_user_uuid: targetUserId,
                    details_param: details,
                    ip_address_param: ipAddress,
                    user_agent_param: userAgent
                });
        } catch (error) {
            console.error('Failed to log admin action:', error);
        }
    }

    /**
     * Get system health metrics
     */
    async getSystemHealth() {
        try {
            // Check main services
            const services = [
                { name: 'web_app', url: 'http://localhost:3002/health' },
                { name: 'pro_engine', url: 'http://localhost:3007/health' }
            ];

            const healthChecks = await Promise.allSettled(
                services.map(async (service) => {
                    const start = Date.now();
                    try {
                        const response = await fetch(service.url, { timeout: 5000 });
                        const responseTime = Date.now() - start;
                        
                        return {
                            service: service.name,
                            status: response.ok ? 'healthy' : 'degraded',
                            responseTime,
                            error: response.ok ? null : `HTTP ${response.status}`
                        };
                    } catch (error) {
                        return {
                            service: service.name,
                            status: 'down',
                            responseTime: Date.now() - start,
                            error: error.message
                        };
                    }
                })
            );

            // Log health status to database
            for (const check of healthChecks) {
                const result = check.status === 'fulfilled' ? check.value : {
                    service: 'unknown',
                    status: 'error',
                    responseTime: 0,
                    error: check.reason?.message || 'Health check failed'
                };

                await this.supabase
                    .from('system_health_log')
                    .insert({
                        service_name: result.service,
                        status: result.status,
                        response_time_ms: result.responseTime,
                        error_message: result.error,
                        metrics: {
                            timestamp: new Date().toISOString(),
                            check_type: 'api_health'
                        }
                    });
            }

            return healthChecks.map(check => 
                check.status === 'fulfilled' ? check.value : {
                    service: 'error',
                    status: 'failed',
                    error: check.reason?.message
                }
            );
        } catch (error) {
            console.error('System health check failed:', error);
            return [];
        }
    }

    /**
     * Get business metrics for admin dashboard
     */
    async getBusinessMetrics() {
        try {
            const { data: metrics, error } = await this.supabase
                .from('business_metrics')
                .select('*')
                .order('date', { ascending: false })
                .limit(30);

            if (error) {
                console.error('Business metrics error:', error);
                return [];
            }

            return metrics || [];
        } catch (error) {
            console.error('Get business metrics failed:', error);
            return [];
        }
    }

    /**
     * Get subscription analytics
     */
    async getSubscriptionAnalytics() {
        try {
            const { data: analytics, error } = await this.supabase
                .from('subscription_analytics')
                .select('*');

            if (error) {
                console.error('Subscription analytics error:', error);
                return [];
            }

            return analytics || [];
        } catch (error) {
            console.error('Get subscription analytics failed:', error);
            return [];
        }
    }

    /**
     * Search users with advanced filters
     */
    async searchUsers(filters = {}) {
        try {
            let query = this.supabase
                .from('user_profiles')
                .select(`
                    *,
                    auth.users(email, created_at, last_sign_in_at)
                `);

            // Apply filters
            if (filters.email) {
                // Note: This requires a view or function since we can't directly filter on auth.users
                // For now, we'll get all and filter client-side
            }

            if (filters.subscription_tier) {
                query = query.eq('subscription_tier', filters.subscription_tier);
            }

            if (filters.admin_role) {
                query = query.eq('admin_role', filters.admin_role);
            }

            if (filters.created_after) {
                query = query.gte('created_at', filters.created_after);
            }

            if (filters.created_before) {
                query = query.lte('created_at', filters.created_before);
            }

            const { data: users, error } = await query
                .order('created_at', { ascending: false })
                .limit(filters.limit || 50);

            if (error) {
                console.error('User search error:', error);
                return [];
            }

            return users || [];
        } catch (error) {
            console.error('Search users failed:', error);
            return [];
        }
    }

    /**
     * Update user subscription (admin action)
     */
    async updateUserSubscription(adminUserId, targetUserId, newTier, reason = '') {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update({
                    subscription_tier: newTier,
                    updated_at: new Date().toISOString()
                })
                .eq('id', targetUserId)
                .select()
                .single();

            if (error) {
                console.error('Update subscription error:', error);
                throw error;
            }

            // Log admin action
            await this.logAdminAction(
                adminUserId,
                'subscription_updated',
                targetUserId,
                {
                    new_tier: newTier,
                    reason: reason,
                    previous_tier: data?.subscription_tier
                }
            );

            return data;
        } catch (error) {
            console.error('Update user subscription failed:', error);
            throw error;
        }
    }

    /**
     * Suspend/unsuspend user account
     */
    async toggleUserSuspension(adminUserId, targetUserId, suspend = true, reason = '') {
        try {
            const status = suspend ? 'suspended' : 'active';
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update({
                    subscription_status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', targetUserId)
                .select()
                .single();

            if (error) {
                console.error('Toggle suspension error:', error);
                throw error;
            }

            // Log admin action
            await this.logAdminAction(
                adminUserId,
                suspend ? 'user_suspended' : 'user_unsuspended',
                targetUserId,
                {
                    reason: reason,
                    previous_status: data?.subscription_status
                }
            );

            return data;
        } catch (error) {
            console.error('Toggle user suspension failed:', error);
            throw error;
        }
    }
}

module.exports = AdminAuthMiddleware; 