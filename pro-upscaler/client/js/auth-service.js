/**
 * Authentication Service for Pro Upscaler
 * Handles user authentication, session management, and usage tracking
 */
class AuthService {
    constructor() {
        this.baseUrl = 'http://localhost:3002'; // Pro-upscaler server
        this.currentUser = null;
        this.token = localStorage.getItem('auth_token');
        
        // Initialize user menu dropdown functionality
        this.initializeDropdown();
    }

    /**
     * Sign in user with email and password
     */
    async signIn(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Invalid email or password');
            }

            const data = await response.json();
            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('auth_token', this.token);
            
            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    /**
     * Sign up new user
     */
    async signUp(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create account');
            }

            const data = await response.json();
            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('auth_token', this.token);
            
            return data;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('auth_token');
    }

    /**
     * Get current user information
     */
    async getCurrentUser() {
        if (!this.token) return null;

        try {
            const response = await fetch(`${this.baseUrl}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (!response.ok) {
                // Token is invalid, sign out
                await this.signOut();
                return null;
            }

            const userData = await response.json();
            this.currentUser = userData;
            return userData;
        } catch (error) {
            console.error('Get current user error:', error);
            await this.signOut();
            return null;
        }
    }

    /**
     * Check if user can perform a specific processing operation
     */
    async checkUsage(processingType) {
        if (!this.token) {
            return { 
                allowed: false, 
                reason: 'Please sign in to use Pro Upscaler',
                requiresAuth: true
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/check-usage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ processingType }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { 
                    allowed: false, 
                    reason: errorData.message || 'Unable to verify usage limits'
                };
            }

            return await response.json();
        } catch (error) {
            console.error('Check usage error:', error);
            return { 
                allowed: false, 
                reason: 'Unable to verify usage limits. Please try again.'
            };
        }
    }

    /**
     * Log usage after successful processing
     */
    async logUsage(processingType, imageSize, processingTime) {
        if (!this.token) return;

        try {
            await fetch(`${this.baseUrl}/auth/log-usage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    processingType,
                    imageSize,
                    processingTime,
                }),
            });
        } catch (error) {
            console.error('Failed to log usage:', error);
            // Don't throw error - usage logging is not critical
        }
    }

    /**
     * Get current month usage statistics
     */
    async getUsageStats() {
        if (!this.token) return null;

        try {
            const response = await fetch(`${this.baseUrl}/auth/usage`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Failed to get usage stats:', error);
            return null;
        }
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return !!this.token && !!this.currentUser;
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
window.authService = new AuthService(); 