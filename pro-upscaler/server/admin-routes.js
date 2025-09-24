/**
 * Admin Routes
 * Comprehensive admin interface for user management, system monitoring, and business intelligence
 */

const express = require('express');
const AdminAuthMiddleware = require('./admin-auth-middleware');

class AdminRoutes {
    constructor() {
        this.router = express.Router();
        this.adminAuth = new AdminAuthMiddleware();
        this.setupRoutes();
        
        console.log('✅ Admin Routes initialized');
    }

    setupRoutes() {
        // Admin authentication and permissions
        this.router.get('/auth/profile', 
            this.adminAuth.authenticateAdmin(),
            this.getAdminProfile.bind(this)
        );

        this.router.get('/auth/permissions', 
            this.adminAuth.authenticateAdmin(),
            this.getAdminPermissions.bind(this)
        );

        // System Health Monitoring
        this.router.get('/system/health', 
            this.adminAuth.authenticateAdmin('system.monitoring'),
            this.getSystemHealth.bind(this)
        );

        this.router.get('/system/metrics', 
            this.adminAuth.authenticateAdmin('system.monitoring'),
            this.getSystemMetrics.bind(this)
        );

        this.router.get('/system/logs', 
            this.adminAuth.authenticateAdmin('system.logs'),
            this.getSystemLogs.bind(this)
        );

        // User Management
        this.router.get('/users/search', 
            this.adminAuth.authenticateAdmin('user_management.view'),
            this.searchUsers.bind(this)
        );

        this.router.get('/users/:userId', 
            this.adminAuth.authenticateAdmin('user_management.view'),
            this.getUserDetails.bind(this)
        );

        this.router.put('/users/:userId/subscription', 
            this.adminAuth.authenticateAdmin('user_management.edit'),
            this.updateUserSubscription.bind(this)
        );

        this.router.put('/users/:userId/suspend', 
            this.adminAuth.authenticateAdmin('user_management.suspend'),
            this.suspendUser.bind(this)
        );

        this.router.put('/users/:userId/unsuspend', 
            this.adminAuth.authenticateAdmin('user_management.suspend'),
            this.unsuspendUser.bind(this)
        );

        this.router.delete('/users/:userId', 
            this.adminAuth.authenticateAdmin('user_management.delete'),
            this.deleteUser.bind(this)
        );

        // Billing and Subscription Management
        this.router.get('/billing/overview', 
            this.adminAuth.authenticateAdmin('billing.view'),
            this.getBillingOverview.bind(this)
        );

        this.router.get('/billing/transactions', 
            this.adminAuth.authenticateAdmin('billing.view'),
            this.getBillingTransactions.bind(this)
        );

        this.router.post('/billing/refund', 
            this.adminAuth.authenticateAdmin('billing.refunds'),
            this.processRefund.bind(this)
        );

        // Business Intelligence and Analytics
        this.router.get('/analytics/overview', 
            this.adminAuth.authenticateAdmin('analytics.view'),
            this.getAnalyticsOverview.bind(this)
        );

        this.router.get('/analytics/users', 
            this.adminAuth.authenticateAdmin('analytics.view'),
            this.getUserAnalytics.bind(this)
        );

        this.router.get('/analytics/revenue', 
            this.adminAuth.authenticateAdmin('analytics.view'),
            this.getRevenueAnalytics.bind(this)
        );

        this.router.get('/analytics/usage', 
            this.adminAuth.authenticateAdmin('analytics.view'),
            this.getUsageAnalytics.bind(this)
        );

        this.router.get('/analytics/export', 
            this.adminAuth.authenticateAdmin('analytics.export'),
            this.exportAnalytics.bind(this)
        );

        // Admin Management
        this.router.get('/admin/users', 
            this.adminAuth.authenticateAdmin('user_management.view'),
            this.getAdminUsers.bind(this)
        );

        this.router.post('/admin/users/:userId/role', 
            this.adminAuth.authenticateAdmin('user_management.edit'),
            this.assignAdminRole.bind(this)
        );

        this.router.get('/admin/audit-log', 
            this.adminAuth.authenticateAdmin('system.logs'),
            this.getAuditLog.bind(this)
        );

        // Support and Communications
        this.router.get('/support/tickets', 
            this.adminAuth.authenticateAdmin('support.tickets'),
            this.getSupportTickets.bind(this)
        );

        this.router.post('/support/broadcast', 
            this.adminAuth.authenticateAdmin('support.communications'),
            this.sendBroadcast.bind(this)
        );
    }

    // Admin Authentication Methods
    async getAdminProfile(req, res) {
        try {
            const admin = req.admin;
            res.json({
                success: true,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    role: admin.role,
                    permissions: admin.permissions,
                    profile: admin.profile
                }
            });
        } catch (error) {
            console.error('Get admin profile error:', error);
            res.status(500).json({ message: 'Failed to get admin profile' });
        }
    }

    async getAdminPermissions(req, res) {
        try {
            const permissions = req.admin.permissions;
            res.json({
                success: true,
                permissions: permissions.map(p => ({
                    name: p.permission_name,
                    description: p.admin_permissions.description,
                    category: p.admin_permissions.category
                }))
            });
        } catch (error) {
            console.error('Get admin permissions error:', error);
            res.status(500).json({ message: 'Failed to get permissions' });
        }
    }

    // System Health Methods
    async getSystemHealth(req, res) {
        try {
            const health = await this.adminAuth.getSystemHealth();
            res.json({
                success: true,
                services: health,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Get system health error:', error);
            res.status(500).json({ message: 'Failed to get system health' });
        }
    }

    async getSystemMetrics(req, res) {
        try {
            const metrics = await this.adminAuth.getBusinessMetrics();
            res.json({
                success: true,
                metrics: metrics
            });
        } catch (error) {
            console.error('Get system metrics error:', error);
            res.status(500).json({ message: 'Failed to get system metrics' });
        }
    }

    async getSystemLogs(req, res) {
        try {
            const { service, level, limit = 100 } = req.query;
            
            // This would integrate with your logging system
            // For now, return system health logs
            const { data: logs, error } = await this.adminAuth.supabase
                .from('system_health_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                logs: logs || []
            });
        } catch (error) {
            console.error('Get system logs error:', error);
            res.status(500).json({ message: 'Failed to get system logs' });
        }
    }

    // User Management Methods
    async searchUsers(req, res) {
        try {
            const filters = {
                email: req.query.email,
                subscription_tier: req.query.tier,
                admin_role: req.query.admin_role,
                created_after: req.query.created_after,
                created_before: req.query.created_before,
                limit: parseInt(req.query.limit) || 50
            };

            const users = await this.adminAuth.searchUsers(filters);
            
            await this.adminAuth.logAdminAction(
                req.admin.id,
                'users_searched',
                null,
                { filters },
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                users: users,
                count: users.length
            });
        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json({ message: 'Failed to search users' });
        }
    }

    async getUserDetails(req, res) {
        try {
            const { userId } = req.params;
            
            const { data: user, error } = await this.adminAuth.supabase
                .from('user_profiles')
                .select(`
                    *,
                    usage_logs(
                        processing_type,
                        scale_factor,
                        processing_time_ms,
                        created_at
                    )
                `)
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            await this.adminAuth.logAdminAction(
                req.admin.id,
                'user_details_viewed',
                userId,
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                user: user
            });
        } catch (error) {
            console.error('Get user details error:', error);
            res.status(500).json({ message: 'Failed to get user details' });
        }
    }

    async updateUserSubscription(req, res) {
        try {
            const { userId } = req.params;
            const { tier, reason } = req.body;

            const result = await this.adminAuth.updateUserSubscription(
                req.admin.id,
                userId,
                tier,
                reason
            );

            res.json({
                success: true,
                user: result,
                message: `Subscription updated to ${tier}`
            });
        } catch (error) {
            console.error('Update user subscription error:', error);
            res.status(500).json({ message: 'Failed to update subscription' });
        }
    }

    async suspendUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            const result = await this.adminAuth.toggleUserSuspension(
                req.admin.id,
                userId,
                true,
                reason
            );

            res.json({
                success: true,
                user: result,
                message: 'User suspended successfully'
            });
        } catch (error) {
            console.error('Suspend user error:', error);
            res.status(500).json({ message: 'Failed to suspend user' });
        }
    }

    async unsuspendUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            const result = await this.adminAuth.toggleUserSuspension(
                req.admin.id,
                userId,
                false,
                reason
            );

            res.json({
                success: true,
                user: result,
                message: 'User unsuspended successfully'
            });
        } catch (error) {
            console.error('Unsuspend user error:', error);
            res.status(500).json({ message: 'Failed to unsuspend user' });
        }
    }

    async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            // This is a dangerous operation - require super admin
            if (req.admin.role !== 'super_admin') {
                return res.status(403).json({ 
                    message: 'Super admin required for user deletion' 
                });
            }

            // Log before deletion
            await this.adminAuth.logAdminAction(
                req.admin.id,
                'user_deleted',
                userId,
                { reason },
                req.ip,
                req.get('User-Agent')
            );

            // Delete user profile (this will cascade due to foreign key constraints)
            const { error } = await this.adminAuth.supabase
                .from('user_profiles')
                .delete()
                .eq('id', userId);

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ message: 'Failed to delete user' });
        }
    }

    // Business Intelligence Methods
    async getAnalyticsOverview(req, res) {
        try {
            const [businessMetrics, subscriptionAnalytics] = await Promise.all([
                this.adminAuth.getBusinessMetrics(),
                this.adminAuth.getSubscriptionAnalytics()
            ]);

            res.json({
                success: true,
                overview: {
                    business_metrics: businessMetrics.slice(0, 7), // Last 7 days
                    subscription_analytics: subscriptionAnalytics,
                    generated_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Get analytics overview error:', error);
            res.status(500).json({ message: 'Failed to get analytics overview' });
        }
    }

    async getUserAnalytics(req, res) {
        try {
            const { data: userStats, error } = await this.adminAuth.supabase
                .from('user_profiles')
                .select(`
                    subscription_tier,
                    created_at,
                    subscription_status
                `);

            if (error) {
                throw error;
            }

            // Process user statistics
            const analytics = {
                total_users: userStats.length,
                active_users: userStats.filter(u => u.subscription_status === 'active').length,
                by_tier: {},
                growth_30d: 0
            };

            // Group by subscription tier
            userStats.forEach(user => {
                analytics.by_tier[user.subscription_tier] = 
                    (analytics.by_tier[user.subscription_tier] || 0) + 1;
            });

            // Calculate 30-day growth
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            analytics.growth_30d = userStats.filter(u => 
                new Date(u.created_at) > thirtyDaysAgo
            ).length;

            res.json({
                success: true,
                user_analytics: analytics
            });
        } catch (error) {
            console.error('Get user analytics error:', error);
            res.status(500).json({ message: 'Failed to get user analytics' });
        }
    }

    async getRevenueAnalytics(req, res) {
        try {
            // This would integrate with Stripe for actual revenue data
            // For now, calculate estimated revenue based on subscriptions
            const subscriptionAnalytics = await this.adminAuth.getSubscriptionAnalytics();
            
            const tierPrices = {
                'free': 0,
                'basic': 9.99,
                'pro': 19.99
            };

            let estimatedMRR = 0;
            subscriptionAnalytics.forEach(tier => {
                estimatedMRR += (tierPrices[tier.subscription_tier] || 0) * tier.user_count;
            });

            res.json({
                success: true,
                revenue_analytics: {
                    estimated_mrr: estimatedMRR,
                    estimated_arr: estimatedMRR * 12,
                    subscription_breakdown: subscriptionAnalytics.map(tier => ({
                        tier: tier.subscription_tier,
                        users: tier.user_count,
                        estimated_revenue: (tierPrices[tier.subscription_tier] || 0) * tier.user_count
                    }))
                }
            });
        } catch (error) {
            console.error('Get revenue analytics error:', error);
            res.status(500).json({ message: 'Failed to get revenue analytics' });
        }
    }

    async getUsageAnalytics(req, res) {
        try {
            const { data: usageStats, error } = await this.adminAuth.supabase
                .from('usage_logs')
                .select('*')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

            if (error) {
                throw error;
            }

            const analytics = {
                total_jobs: usageStats.length,
                by_type: {},
                by_scale_factor: {},
                avg_processing_time: 0,
                total_pixels: 0
            };

            usageStats.forEach(log => {
                // Group by processing type
                analytics.by_type[log.processing_type] = 
                    (analytics.by_type[log.processing_type] || 0) + 1;

                // Group by scale factor
                analytics.by_scale_factor[log.scale_factor] = 
                    (analytics.by_scale_factor[log.scale_factor] || 0) + 1;

                // Sum processing time and pixels
                analytics.avg_processing_time += log.processing_time_ms || 0;
                analytics.total_pixels += log.image_pixels || 0;
            });

            analytics.avg_processing_time = usageStats.length > 0 ? 
                analytics.avg_processing_time / usageStats.length : 0;

            res.json({
                success: true,
                usage_analytics: analytics
            });
        } catch (error) {
            console.error('Get usage analytics error:', error);
            res.status(500).json({ message: 'Failed to get usage analytics' });
        }
    }

    async exportAnalytics(req, res) {
        try {
            const { format = 'json', type = 'overview' } = req.query;
            
            let data;
            switch (type) {
                case 'users':
                    data = await this.getUserAnalytics(req, { json: () => {} });
                    break;
                case 'revenue':
                    data = await this.getRevenueAnalytics(req, { json: () => {} });
                    break;
                case 'usage':
                    data = await this.getUsageAnalytics(req, { json: () => {} });
                    break;
                default:
                    data = await this.getAnalyticsOverview(req, { json: () => {} });
            }

            await this.adminAuth.logAdminAction(
                req.admin.id,
                'analytics_exported',
                null,
                { type, format },
                req.ip,
                req.get('User-Agent')
            );

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${Date.now()}.csv"`);
                // Convert to CSV (simplified)
                res.send('CSV export not yet implemented');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${Date.now()}.json"`);
                res.json(data);
            }
        } catch (error) {
            console.error('Export analytics error:', error);
            res.status(500).json({ message: 'Failed to export analytics' });
        }
    }

    // Admin Management Methods
    async getAdminUsers(req, res) {
        try {
            const { data: adminUsers, error } = await this.adminAuth.supabase
                .from('user_profiles')
                .select('*')
                .not('admin_role', 'is', null)
                .order('admin_created_at', { ascending: false });

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                admin_users: adminUsers || []
            });
        } catch (error) {
            console.error('Get admin users error:', error);
            res.status(500).json({ message: 'Failed to get admin users' });
        }
    }

    async assignAdminRole(req, res) {
        try {
            const { userId } = req.params;
            const { role, permissions } = req.body;

            // Only super admins can assign roles
            if (req.admin.role !== 'super_admin') {
                return res.status(403).json({ 
                    message: 'Super admin required for role assignment' 
                });
            }

            const { data, error } = await this.adminAuth.supabase
                .from('user_profiles')
                .update({
                    admin_role: role,
                    admin_permissions: permissions,
                    admin_created_at: new Date().toISOString(),
                    admin_created_by: req.admin.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            await this.adminAuth.logAdminAction(
                req.admin.id,
                'admin_role_assigned',
                userId,
                { role, permissions },
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                user: data,
                message: `Admin role ${role} assigned successfully`
            });
        } catch (error) {
            console.error('Assign admin role error:', error);
            res.status(500).json({ message: 'Failed to assign admin role' });
        }
    }

    async getAuditLog(req, res) {
        try {
            const { limit = 100, admin_user_id, action } = req.query;

            let query = this.adminAuth.supabase
                .from('admin_audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (admin_user_id) {
                query = query.eq('admin_user_id', admin_user_id);
            }

            if (action) {
                query = query.eq('action', action);
            }

            const { data: auditLog, error } = await query;

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                audit_log: auditLog || []
            });
        } catch (error) {
            console.error('Get audit log error:', error);
            res.status(500).json({ message: 'Failed to get audit log' });
        }
    }

    // Support Methods (placeholder implementations)
    async getSupportTickets(req, res) {
        try {
            // Placeholder - would integrate with support ticket system
            res.json({
                success: true,
                tickets: [],
                message: 'Support ticket integration not yet implemented'
            });
        } catch (error) {
            console.error('Get support tickets error:', error);
            res.status(500).json({ message: 'Failed to get support tickets' });
        }
    }

    async sendBroadcast(req, res) {
        try {
            const { message, target_users, type } = req.body;
            
            await this.adminAuth.logAdminAction(
                req.admin.id,
                'broadcast_sent',
                null,
                { message, target_users, type },
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                message: 'Broadcast functionality not yet implemented'
            });
        } catch (error) {
            console.error('Send broadcast error:', error);
            res.status(500).json({ message: 'Failed to send broadcast' });
        }
    }

    // Billing Methods (placeholder implementations)
    async getBillingOverview(req, res) {
        try {
            // This would integrate with Stripe for real billing data
            const subscriptionAnalytics = await this.adminAuth.getSubscriptionAnalytics();
            
            res.json({
                success: true,
                billing_overview: {
                    subscription_breakdown: subscriptionAnalytics,
                    note: 'Full billing integration with Stripe pending'
                }
            });
        } catch (error) {
            console.error('Get billing overview error:', error);
            res.status(500).json({ message: 'Failed to get billing overview' });
        }
    }

    async getBillingTransactions(req, res) {
        try {
            res.json({
                success: true,
                transactions: [],
                message: 'Stripe transaction integration not yet implemented'
            });
        } catch (error) {
            console.error('Get billing transactions error:', error);
            res.status(500).json({ message: 'Failed to get billing transactions' });
        }
    }

    async processRefund(req, res) {
        try {
            const { payment_id, amount, reason } = req.body;
            
            await this.adminAuth.logAdminAction(
                req.admin.id,
                'refund_processed',
                null,
                { payment_id, amount, reason },
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                message: 'Refund processing not yet implemented - would integrate with Stripe'
            });
        } catch (error) {
            console.error('Process refund error:', error);
            res.status(500).json({ message: 'Failed to process refund' });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = AdminRoutes; 