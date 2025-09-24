/**
 * Supabase Authentication Middleware
 * Replaces SQLite-based authentication with Supabase-first approach
 */

const { createClient } = require('@supabase/supabase-js');

class SupabaseAuthMiddleware {
    constructor() {
        this.supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04'
        );
        
        console.log('✅ Supabase Authentication Middleware initialized');
    }

    /**
     * Authenticate user using Supabase JWT token
     * Replaces the old JWT middleware
     */
    authenticateToken = async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Access token required' });
            }

            // Verify token with Supabase
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            
            if (error || !user) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }

            // Load user profile from Supabase
            const { data: profile, error: profileError } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                // If profile doesn't exist, create it
                if (profileError.code === 'PGRST116') {
                    const { error: createError } = await this.supabase
                        .from('user_profiles')
                        .insert({
                            id: user.id,
                            subscription_tier: 'free'
                        });
                        
                    if (createError) {
                        console.error('Failed to create user profile:', createError);
                        return res.status(500).json({ message: 'Profile creation failed' });
                    }
                    
                    // Set default profile
                    req.user = {
                        ...user,
                        profile: {
                            id: user.id,
                            subscription_tier: 'free',
                            created_at: new Date().toISOString()
                        }
                    };
                } else {
                    console.error('Profile fetch error:', profileError);
                    return res.status(500).json({ message: 'Profile fetch failed' });
                }
            } else {
                // Attach user data to request
                req.user = {
                    ...user,
                    profile
                };
            }

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ message: 'Authentication error' });
        }
    };

    /**
     * Check usage limits using Supabase
     * Replaces SQLite-based usage checking
     */
    checkUsageLimits = async (req, res, next) => {
        try {
            const user = req.user;
            const { processing_type, scale_factor } = req.body;
            
            if (!user || !user.profile) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            // Get user's current tier
            const userTier = user.profile.subscription_tier;
            
            // Get tier limits
            const { data: tierData, error: tierError } = await this.supabase
                .from('subscription_tiers')
                .select('*')
                .eq('tier_name', userTier)
                .single();
                
            if (tierError || !tierData) {
                console.error('Tier lookup error:', tierError);
                return res.status(500).json({ message: 'Tier validation failed' });
            }

            // Check specific limits based on processing type and scale factor
            const allowed = await this.checkSpecificLimits(user.id, tierData, processing_type, scale_factor);
            
            if (!allowed.permitted) {
                return res.status(429).json({
                    message: allowed.reason,
                    upgrade_required: true,
                    current_tier: userTier,
                    limits: {
                        current_usage: allowed.current_usage,
                        limit: allowed.limit
                    }
                });
            }
            
            next();
        } catch (error) {
            console.error('Usage limits middleware error:', error);
            res.status(500).json({ message: 'Usage validation error' });
        }
    };

    /**
     * Check specific usage limits based on tier and processing type
     */
    async checkSpecificLimits(userId, tierData, processingType, scaleFactor) {
        try {
            // Free tier restrictions
            if (tierData.tier_name === 'free') {
                // Check 8x+ upscaling limits (free users can't use 8x+)
                if (scaleFactor && ['8', '10', '12', '15'].includes(scaleFactor.toString())) {
                    return {
                        permitted: false,
                        reason: 'High-resolution upscaling (8x+) requires Pro subscription',
                        current_usage: 0,
                        limit: 0
                    };
                }
                
                // Check AI enhancement limits
                if (processingType === 'ai_enhancement') {
                    const { count: aiUsage } = await this.supabase
                        .from('usage_logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId)
                        .eq('processing_type', 'ai_enhancement')
                        .gte('created_at', this.getMonthStart());
                        
                    const currentUsage = aiUsage || 0;
                    const limit = tierData.max_ai_enhancements;
                    
                    if (limit !== -1 && currentUsage >= limit) {
                        return {
                            permitted: false,
                            reason: `AI enhancement limit reached (${currentUsage}/${limit} this month)`,
                            current_usage: currentUsage,
                            limit: limit
                        };
                    }
                }
            }
            
            // All checks passed
            return { permitted: true };
            
        } catch (error) {
            console.error('Limits check error:', error);
            return {
                permitted: false,
                reason: 'Usage validation error',
                current_usage: 0,
                limit: 0
            };
        }
    }

    /**
     * Log usage to Supabase
     * Replaces SQLite usage logging
     */
    async logUsage(userId, processingData) {
        try {
            const { error } = await this.supabase
                .from('usage_logs')
                .insert({
                    user_id: userId,
                    processing_type: processingData.processing_type || 'standard',
                    scale_factor: processingData.scale_factor || '2x',
                    image_pixels: processingData.image_pixels || 0,
                    processing_time_ms: processingData.processing_time || 0
                });
                
            if (error) {
                console.error('Usage logging error:', error);
            } else {
                console.log(`📊 Usage logged: ${userId} - ${processingData.processing_type} ${processingData.scale_factor}`);
            }
        } catch (error) {
            console.error('Usage logging error:', error);
        }
    }

    /**
     * Get current user profile
     * Replaces SQLite user lookup
     */
    async getUserProfile(userId) {
        try {
            const { data: profile, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) {
                console.error('Profile lookup error:', error);
                return null;
            }
            
            return profile;
        } catch (error) {
            console.error('Profile lookup error:', error);
            return null;
        }
    }

    /**
     * Update user subscription tier
     */
    async updateUserTier(userId, newTier) {
        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .update({ 
                    subscription_tier: newTier,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
                
            if (error) {
                console.error('Tier update error:', error);
                return false;
            }
            
            console.log(`✅ Updated user ${userId} to ${newTier} tier`);
            return true;
        } catch (error) {
            console.error('Tier update error:', error);
            return false;
        }
    }

    /**
     * Get start of current month for usage calculations
     */
    getMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    /**
     * Get user usage statistics
     */
    async getUserUsageStats(userId) {
        try {
            // Get current month usage
            const { data: monthlyUsage } = await this.supabase
                .from('usage_logs')
                .select('processing_type, scale_factor')
                .eq('user_id', userId)
                .gte('created_at', this.getMonthStart());
                
            // Get user profile
            const profile = await this.getUserProfile(userId);
            
            if (!profile) {
                return null;
            }
            
            // Calculate usage stats
            const stats = {
                user_tier: profile.subscription_tier,
                monthly_usage: {
                    total: monthlyUsage ? monthlyUsage.length : 0,
                    ai_enhancements: monthlyUsage ? monthlyUsage.filter(u => u.processing_type === 'ai_enhancement').length : 0,
                    high_res: monthlyUsage ? monthlyUsage.filter(u => ['8x', '10x', '12x', '15x'].includes(u.scale_factor)).length : 0
                },
                created_at: profile.created_at
            };
            
            return stats;
        } catch (error) {
            console.error('Usage stats error:', error);
            return null;
        }
    }
}

module.exports = SupabaseAuthMiddleware; 