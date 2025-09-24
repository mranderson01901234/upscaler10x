/**
 * Dashboard Service - Handles API calls and data management for the dashboard
 */

class DashboardService {
    constructor() {
        this.baseUrl = 'http://localhost:3002';
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    // Helper method for making authenticated requests
    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('supabase_token') || sessionStorage.getItem('supabase_token');
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        try {
            const response = await fetch(`${this.baseUrl}${url}`, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Cache management
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Get subscription tiers
    async getSubscriptionTiers() {
        const cacheKey = 'subscription_tiers';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const data = await this.makeRequest('/api/payments/tiers');
            this.setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            // Return mock data if API fails
            return {
                tiers: [
                    {
                        name: 'free',
                        price_monthly: 0,
                        max_ai_enhancements: 5,
                        features: ['2x-4x upscaling', '5 AI enhancements/month', 'Standard support']
                    },
                    {
                        name: 'basic',
                        price_monthly: 9.99,
                        max_ai_enhancements: 50,
                        features: ['Up to 8x upscaling', '50 AI enhancements/month', 'Priority support']
                    },
                    {
                        name: 'pro',
                        price_monthly: 19.99,
                        max_ai_enhancements: -1,
                        features: ['Up to 15x upscaling', 'Unlimited AI enhancements', 'Premium support']
                    }
                ]
            };
        }
    }

    // Get current user subscription
    async getCurrentSubscription() {
        const cacheKey = 'current_subscription';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const data = await this.makeRequest('/api/payments/subscription');
            this.setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            // Return mock data if API fails
            return {
                subscription_tier: 'Free',
                is_active: true,
                current_period_end: null
            };
        }
    }

    // Get user profile and usage stats
    async getUserProfile() {
        const cacheKey = 'user_profile';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const data = await this.makeRequest('/api/user/profile');
            this.setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            // Return mock data if API fails
            return {
                user: {
                    id: 'demo_user',
                    subscription_tier: 'Free',
                    usage_stats: {
                        monthly_uploads: 7,
                        monthly_limit: 10,
                        ai_enhancements: 2,
                        ai_limit: 5,
                        total_processing_time: 234,
                        files_processed: 15
                    }
                }
            };
        }
    }

    // Get processing history
    async getProcessingHistory(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value.toString());
                }
            });

            const url = `/api/processing/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            return await this.makeRequest(url);
        } catch (error) {
            // Return mock data if API fails
            return {
                history: [
                    {
                        id: '1',
                        filename: 'landscape_sunset_4k.jpg',
                        original_size: '8.5 MB',
                        scale_factor: '4x',
                        output_size: '136 MB',
                        processing_time: 18.3,
                        status: 'completed',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        processing_type: 'ai_enhanced',
                        thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center'
                    },
                    {
                        id: '2',
                        filename: 'portrait_wedding.png',
                        original_size: '12.1 MB',
                        scale_factor: '2x',
                        output_size: '48.4 MB',
                        processing_time: 8.7,
                        status: 'completed',
                        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                        processing_type: 'standard',
                        thumbnail_url: 'https://images.unsplash.com/photo-1494790108755-2616c75107ab?w=80&h=80&fit=crop&crop=face'
                    },
                    {
                        id: '3',
                        filename: 'artwork_vintage.jpg',
                        original_size: '6.2 MB',
                        scale_factor: '8x',
                        output_size: '396.8 MB',
                        processing_time: 45.2,
                        status: 'completed',
                        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                        processing_type: 'ai_enhanced',
                        thumbnail_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=80&h=80&fit=crop&crop=center'
                    }
                ]
            };
        }
    }

    // System health checks
    async getSystemHealth() {
        try {
            const [serverHealth, desktopHealth] = await Promise.allSettled([
                fetch(`${this.baseUrl}/health`),
                fetch('http://localhost:3007/health')
            ]);

            return {
                server: serverHealth.status === 'fulfilled' && serverHealth.value.ok,
                desktop: desktopHealth.status === 'fulfilled' && desktopHealth.value.ok,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                server: false,
                desktop: false,
                timestamp: Date.now()
            };
        }
    }

    // Create checkout session
    async createCheckoutSession(tier) {
        try {
            return await this.makeRequest('/api/payments/create-checkout-session', {
                method: 'POST',
                body: JSON.stringify({
                    tier,
                    success_url: `${window.location.origin}/dashboard.html?payment=success`,
                    cancel_url: `${window.location.origin}/dashboard.html?payment=cancelled`
                })
            });
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            throw error;
        }
    }

    // Create billing portal session
    async createBillingPortalSession() {
        try {
            return await this.makeRequest('/api/payments/create-billing-portal', {
                method: 'POST',
                body: JSON.stringify({
                    return_url: `${window.location.origin}/dashboard.html`
                })
            });
        } catch (error) {
            console.error('Failed to create billing portal session:', error);
            throw error;
        }
    }

    // Utility methods
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        
        return date.toLocaleDateString();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Generate thumbnail URL based on filename
    generateThumbnailUrl(filename) {
        // In a real implementation, this would return actual thumbnail URLs from your processing system
        // For now, we'll use sample images based on filename patterns
        if (filename.includes('landscape') || filename.includes('sunset') || filename.includes('mountain')) {
            return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center';
        } else if (filename.includes('portrait') || filename.includes('wedding') || filename.includes('person')) {
            return 'https://images.unsplash.com/photo-1494790108755-2616c75107ab?w=80&h=80&fit=crop&crop=face';
        } else if (filename.includes('artwork') || filename.includes('vintage') || filename.includes('painting')) {
            return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=80&h=80&fit=crop&crop=center';
        } else if (filename.includes('nature') || filename.includes('macro') || filename.includes('flower')) {
            return 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=80&h=80&fit=crop&crop=center';
        } else if (filename.includes('city') || filename.includes('urban') || filename.includes('building')) {
            return 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=80&h=80&fit=crop&crop=center';
        } else {
            // Default thumbnail for unknown image types
            return 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=80&h=80&fit=crop&crop=center';
        }
    }

    // Create activity item HTML with thumbnail
    createActivityItemHTML(item) {
        const thumbnailUrl = item.thumbnail_url || this.generateThumbnailUrl(item.filename);
        const timeAgo = this.formatTimeAgo(item.timestamp);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <img src="${thumbnailUrl}" alt="${item.filename} thumbnail" class="activity-thumbnail" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <svg class="activity-icon-fallback" style="display: none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="9" cy="9" r="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                </div>
                <div class="activity-details">
                    <div class="activity-name">${item.filename}</div>
                    <div class="activity-meta">${item.scale_factor} upscaling • ${item.processing_time}s • ${item.processing_type === 'ai_enhanced' ? 'AI Enhanced' : 'Standard'}</div>
                </div>
                <div class="activity-status">
                    <div class="status-dot status-${item.status}"></div>
                    <span>${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                </div>
            </div>
        `;
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
}

// Export singleton instance
window.dashboardService = new DashboardService(); 