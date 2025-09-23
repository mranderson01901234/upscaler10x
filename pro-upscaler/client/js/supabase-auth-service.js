/**
 * Supabase Authentication Service for Pro Upscaler
 * Handles user authentication, session management, and usage tracking using Supabase
 */
class SupabaseAuthService {
    constructor() {
        // Replace with your Supabase project details
        const SUPABASE_URL = 'https://vztoftcjbwzwioxarovy.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04';
        
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.currentUser = null;
        this.userProfile = null;
        
        // Initialize user menu dropdown functionality
        this.initializeDropdown();
        
        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.loadUserProfile();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userProfile = null;
            }
        });
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            this.currentUser = data.user;
            await this.loadUserProfile();
            
            return { user: this.currentUser, profile: this.userProfile };
        } catch (error) {
            throw new Error(error.message || 'Sign in failed');
        }
    }

    async signUp(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            if (data.user && !data.session) {
                throw new Error('Please check your email for verification link');
            }

            this.currentUser = data.user;
            await this.loadUserProfile();
            
            return { user: this.currentUser, profile: this.userProfile };
        } catch (error) {
            throw new Error(error.message || 'Sign up failed');
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.userProfile = null;
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    async getCurrentUser() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session?.user) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                return this.currentUser;
            }
            
            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return null;

        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    *,
                    subscription_tiers (*)
                `)
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                // If profile doesn't exist, create one
                if (error.code === 'PGRST116') {
                    console.log('Creating user profile...');
                    const { data: newProfile, error: createError } = await this.supabase
                        .from('user_profiles')
                        .insert({
                            id: this.currentUser.id,
                            subscription_tier: 'free'
                        })
                        .select(`
                            *,
                            subscription_tiers (*)
                        `)
                        .single();
                    
                    if (createError) throw createError;
                    this.userProfile = newProfile;
                    return newProfile;
                }
                throw error;
            }
            
            this.userProfile = data;
            return data;
        } catch (error) {
            console.error('Load user profile error:', error);
            return null;
        }
    }

    async checkUsage(processingType) {
        if (!this.currentUser) {
            return { 
                allowed: false, 
                reason: 'Please sign in to use Pro Upscaler',
                requiresAuth: true
            };
        }

        try {
            const { data, error } = await this.supabase
                .rpc('check_usage_limit', {
                    user_uuid: this.currentUser.id,
                    processing_type_param: processingType
                });

            if (error) throw error;

            const result = data[0];
            
            if (!result.allowed) {
                const tierName = this.userProfile?.subscription_tier || 'free';
                let reason;
                if (tierName === 'free') {
                    if (processingType === 'ai_enhancement') {
                        reason = 'Free tier includes 3 AI enhancements per month.';
                    } else if (processingType === 'highres') {
                        reason = 'Free tier does not include 8x+ high-res processing.';
                    } else {
                        reason = 'Limit reached for free tier.';
                    }
                } else if (tierName === 'admin') {
                    reason = 'Admin tier should have unlimited access. Please contact support.';
                } else {
                    reason = `${processingType} limit reached for ${tierName} tier.`;
                }
                return {
                    allowed: false,
                    reason,
                    currentUsage: result.current_usage,
                    limit: result.limit_value
                };
            }

            return {
                allowed: true,
                currentUsage: result.current_usage,
                limit: result.limit_value
            };
        } catch (error) {
            console.error('Check usage error:', error);
            return { allowed: false, reason: 'Unable to verify usage limits' };
        }
    }

    async logUsage(processingType, scaleFactor, imagePixels, processingTimeMs) {
        if (!this.currentUser) return;

        try {
            const { error } = await this.supabase
                .from('usage_logs')
                .insert({
                    user_id: this.currentUser.id,
                    processing_type: processingType,
                    scale_factor: scaleFactor,
                    image_pixels: imagePixels,
                    processing_time_ms: processingTimeMs
                });

            if (error) throw error;
        } catch (error) {
            console.error('Log usage error:', error);
        }
    }

    async getUsageStats() {
        if (!this.currentUser) return null;

        try {
            const { data, error } = await this.supabase
                .from('monthly_usage')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('month', new Date().toISOString().slice(0, 7) + '-01');

            if (error) throw error;

            // Convert array to object for easy access
            const stats = {
                standard: 0,
                highres: 0,
                ai_enhancement: 0
            };

            data.forEach(row => {
                stats[row.processing_type] = row.usage_count;
            });

            return stats;
        } catch (error) {
            console.error('Get usage stats error:', error);
            return null;
        }
    }

    isSignedIn() {
        return !!this.currentUser;
    }

    getUserProfile() {
        return this.userProfile;
    }

    getSubscriptionTier() {
        return this.userProfile?.subscription_tier || 'free';
    }

    /**
     * Get processing type based on scale factor and AI enhancement
     */
    getProcessingType(scaleFactor, aiEnhancement) {
        if (aiEnhancement) {
            return 'ai_enhancement';
        } else if (['2', '4'].includes(scaleFactor.toString())) {
            return 'standard';
        } else {
            return 'highres';
        }
    }

    /**
     * Initialize dropdown menu functionality
     */
    initializeDropdown() {
        // Initialize dropdown when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const menuButton = document.getElementById('user-menu-button');
            const dropdown = document.getElementById('user-dropdown');

            if (menuButton && dropdown) {
                menuButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('hidden');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    dropdown.classList.add('hidden');
                });

                // Prevent dropdown from closing when clicking inside it
                dropdown.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });
    }

    /**
     * Show notification helper
     */
    showNotification(message, type = 'info') {
        // Create notification element
        if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification(message, type);
            return;
        }
        // Fallback placement if app not initialized
        const container = document.getElementById('canvas-notifications') || document.body;
        const notification = document.createElement('div');
        notification.className = `canvas-notification-item ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 4000);
    }
}

// Export for use in main.js and create global instance
window.authService = new SupabaseAuthService(); 