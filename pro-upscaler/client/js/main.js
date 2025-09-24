// Enterprise Pro Upscaler Application
import { ImagePresentationManager } from './image-presentation-manager.js';

class EnterpriseProUpscalerApp {
    constructor() {
        this.presentationManager = new ImagePresentationManager();
        this.authService = null;
        this.proEngineInterface = null;
        
        this.initializeApp();
    }

    async initializeApp() {
        console.log('🚀 Initializing Enterprise Pro Upscaler');
        
        // Initialize existing services
        await this.initializeAuth();
        this.initializeProEngine();
        this.initializeUpscaler();
        
        // Setup header functionality
        this.setupHeaderFunctionality();
        
        // Initialize authentication UI
        this.initializeAuthenticationUI();
        
        // Initialize Pro Engine status monitoring
        this.initializeProEngineStatusMonitoring();
        
        // Initialize AI enhancement toggle
        this.initializeAIEnhancementToggle();
        
        console.log('✅ Enterprise Pro Upscaler initialized');
    }

    async initializeAuth() {
        try {
            // Initialize existing auth service
            this.authService = window.authService;
            if (this.authService) {
                const user = await this.authService.getCurrentUser();
                if (user) {
                    console.log('🔐 User already authenticated');
                    this.updateAuthenticationUI(true, user);
                    
                    // Force refresh user tier from server if using local auth
                    if (user.email === 'dparker918@yahoo.com') {
                        this.refreshUserTierFromServer();
                    }
                } else {
                    this.updateAuthenticationUI(false);
                }
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    }
    
    /**
     * Force refresh user tier from server
     */
    async refreshUserTierFromServer() {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                const response = await fetch('http://localhost:3002/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log('🔄 Refreshed user data from server:', userData);
                    this.updateAuthenticationUI(true, userData);
                }
            }
        } catch (error) {
            console.error('Failed to refresh user tier:', error);
        }
    }

    initializeProEngine() {
        try {
            // Initialize existing Pro Engine interface
            this.proEngineInterface = new ProEngineInterface();
            console.log('⚡ Pro Engine interface initialized');
            
            // Pass ProEngine interface to presentation manager with retry
            this.linkProEngineToPresentation();
        } catch (error) {
            console.error('Pro Engine initialization error:', error);
        }
    }
    
    /**
     * Link ProEngine to presentation manager with retry logic
     */
    linkProEngineToPresentation() {
        if (this.presentationManager && this.proEngineInterface) {
            this.presentationManager.proEngineInterface = this.proEngineInterface;
            console.log('✅ ProEngine interface linked to presentation manager');
            
            // Also make it available globally for Firefox compatibility
            window.proEngineInterface = this.proEngineInterface;
            
            // Verify the connection
            setTimeout(() => {
                const connected = !!this.presentationManager.proEngineInterface;
                console.log(`🔍 ProEngine connection verified: ${connected}`);
                if (!connected) {
                    console.log('🔄 Retrying ProEngine connection...');
                    this.presentationManager.proEngineInterface = this.proEngineInterface;
                }
            }, 1000);
        } else {
            console.log('⚠️ ProEngine linking delayed - retrying in 500ms');
            setTimeout(() => this.linkProEngineToPresentation(), 500);
        }
    }

    initializeUpscaler() {
        try {
            // Initialize existing upscaler
            if (typeof UltraFastUpscaler !== 'undefined') {
                this.upscaler = new UltraFastUpscaler({ qualityMode: 'speed' });
                console.log('✅ Using Ultra-Fast Upscaler');
            } else if (typeof SimpleUpscaler !== 'undefined') {
                this.upscaler = new SimpleUpscaler();
                console.log('✅ Using Simple Upscaler');
            }
        } catch (error) {
            console.error('Upscaler initialization error:', error);
        }
    }

    setupHeaderFunctionality() {
        // Header upload button
        const headerUploadBtn = document.getElementById('header-upload-btn');
        const headerFileInput = document.getElementById('header-file-input');
        
        if (headerUploadBtn && headerFileInput) {
            headerUploadBtn.addEventListener('click', () => headerFileInput.click());
            headerFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Trigger the presentation manager's file handler
                    this.presentationManager.handleFile(file);
                }
            });
        }

        // Header download button
        const headerDownloadBtn = document.getElementById('header-download-btn');
        if (headerDownloadBtn) {
            headerDownloadBtn.addEventListener('click', () => {
                this.presentationManager.handleDownload();
            });
        }

        // Pricing button
        const pricingButton = document.getElementById('pricing-button');
        if (pricingButton) {
            pricingButton.addEventListener('click', () => {
                this.showSubscriptionModal();
            });
        }
    }

    /**
     * Initialize authentication UI event handlers
     */
    initializeAuthenticationUI() {
        console.log('🔐 Initializing authentication UI');
        
        // Sign in button
        const signinButton = document.getElementById('signin-button');
        if (signinButton) {
            signinButton.addEventListener('click', () => {
                this.showAuthModal('signin');
            });
        }

        // Sign up button
        const signupButton = document.getElementById('signup-button');
        if (signupButton) {
            signupButton.addEventListener('click', () => {
                this.showAuthModal('signup');
            });
        }

        // Auth modal close button
        const authModalClose = document.getElementById('auth-modal-close');
        if (authModalClose) {
            authModalClose.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        // Modal overlay click to close
        const authModalOverlay = document.querySelector('.auth-modal-overlay');
        if (authModalOverlay) {
            authModalOverlay.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        // Sign in form submission
        const signinForm = document.getElementById('signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignIn(e);
            });
        }

        // Sign up form submission
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignUp(e);
            });
        }

        // Form switching links
        const showSignupLink = document.getElementById('show-signup');
        const showSigninLink = document.getElementById('show-signin');
        
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthForm('signup');
            });
        }
        
        if (showSigninLink) {
            showSigninLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthForm('signin');
            });
        }

        // Sign out button
        const signoutButton = document.getElementById('signout-button');
        if (signoutButton) {
            signoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleSignOut();
            });
        }

        // User menu dropdown
        this.initializeUserMenu();
    }

    /**
     * Initialize user menu dropdown
     */
    initializeUserMenu() {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const userMenuButton = document.getElementById('user-menu-button');
            const userDropdown = document.getElementById('user-dropdown');

            if (userMenuButton && userDropdown) {
                console.log('✅ Gear icon elements found, setting up event listeners');
                
                // Remove any existing listeners by cloning the button
                const newMenuButton = userMenuButton.cloneNode(true);
                userMenuButton.parentNode.replaceChild(newMenuButton, userMenuButton);
                
                // Add click handler with proper event handling
                newMenuButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔘 Gear icon clicked!');
                    userDropdown.classList.toggle('hidden');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!newMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                        userDropdown.classList.add('hidden');
                    }
                });

                // Prevent dropdown from closing when clicking inside it
                userDropdown.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // Add handlers for dropdown menu items
                this.initializeDropdownHandlers();
                
                console.log('✅ Gear icon dropdown functionality initialized');
            } else {
                console.log('❌ Gear icon elements not found, retrying in 1 second...');
                // Retry after 1 second if elements not found
                setTimeout(() => this.initializeUserMenu(), 1000);
            }
        }, 100);
    }

    /**
     * Initialize dropdown menu item handlers
     */
    initializeDropdownHandlers() {
        // Usage button
        const viewUsageBtn = document.getElementById('view-usage');
        if (viewUsageBtn) {
            viewUsageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUsageModal();
                document.getElementById('user-dropdown').classList.add('hidden');
            });
        }

        // Subscription management button
        const manageSubscriptionBtn = document.getElementById('manage-subscription');
        if (manageSubscriptionBtn) {
            manageSubscriptionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSubscriptionModal();
                document.getElementById('user-dropdown').classList.add('hidden');
            });
        }

        console.log('✅ Dropdown menu handlers initialized');
    }

    /**
     * Show subscription modal using PaymentManager
     */
    showSubscriptionModal() {
        // Wait a moment for PaymentManager to load if not immediately available
        if (!window.paymentManager) {
            console.log('⏳ PaymentManager not ready, waiting...');
            setTimeout(() => this.showSubscriptionModal(), 100);
            return;
        }
        
        console.log('💳 Opening subscription modal');
        window.paymentManager.showSubscriptionModal();
    }

    /**
     * Show usage statistics modal
     */
    showUsageModal() {
        // TODO: Implement usage statistics modal
        console.log('📊 Usage modal requested');
        alert('Usage statistics feature coming soon!');
    }

    /**
     * Show authentication modal
     */
    showAuthModal(mode = 'signin') {
        const authModal = document.getElementById('auth-modal');
        const authModalTitle = document.getElementById('auth-modal-title');
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');

        if (authModal) {
            authModal.classList.remove('hidden');
            
            if (mode === 'signin') {
                authModalTitle.textContent = 'Sign In';
                signinForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
            } else {
                authModalTitle.textContent = 'Sign Up';
                signinForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            }
        }
    }

    /**
     * Hide authentication modal
     */
    hideAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.classList.add('hidden');
            
            // Clear form fields
            const forms = authModal.querySelectorAll('form');
            forms.forEach(form => form.reset());
        }
    }

    /**
     * Switch between sign in and sign up forms
     */
    switchAuthForm(mode) {
        const authModalTitle = document.getElementById('auth-modal-title');
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');

        if (mode === 'signin') {
            authModalTitle.textContent = 'Sign In';
            signinForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            authModalTitle.textContent = 'Sign Up';
            signinForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
    }

    /**
     * Handle sign in form submission
     */
    async handleSignIn(event) {
        const form = event.target;
        const email = form.querySelector('#signin-email').value;
        const password = form.querySelector('#signin-password').value;

        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            // Disable form
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Signing In...';

            // Try Supabase auth first, then fallback to local auth
            let result;
            if (window.authService && window.authService.supabase) {
                result = await window.authService.signIn(email, password);
            } else if (this.authService) {
                result = await this.authService.signIn(email, password);
            } else {
                throw new Error('Authentication service not available');
            }

            console.log('✅ Sign in successful:', result);
            this.updateAuthenticationUI(true, result.user || result);
            this.hideAuthModal();
            this.showNotification('Successfully signed in!', 'success');

        } catch (error) {
            console.error('Sign in error:', error);
            this.showNotification(error.message || 'Sign in failed', 'error');
        } finally {
            // Re-enable form
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Sign In';
        }
    }

    /**
     * Handle sign up form submission
     */
    async handleSignUp(event) {
        const form = event.target;
        const email = form.querySelector('#signup-email').value;
        const password = form.querySelector('#signup-password').value;
        const confirmPassword = form.querySelector('#signup-confirm').value;

        if (!email || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            // Disable form
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Creating Account...';

            // Try Supabase auth first, then fallback to local auth
            let result;
            if (window.authService && window.authService.supabase) {
                result = await window.authService.signUp(email, password);
            } else if (this.authService) {
                result = await this.authService.signUp(email, password);
            } else {
                throw new Error('Authentication service not available');
            }

            console.log('✅ Sign up successful:', result);
            this.updateAuthenticationUI(true, result.user || result);
            this.hideAuthModal();
            this.showNotification('Account created successfully!', 'success');

        } catch (error) {
            console.error('Sign up error:', error);
            this.showNotification(error.message || 'Sign up failed', 'error');
        } finally {
            // Re-enable form
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
        }
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        try {
            if (window.authService && window.authService.supabase) {
                await window.authService.signOut();
            } else if (this.authService) {
                await this.authService.signOut();
            }

            this.updateAuthenticationUI(false);
            this.showNotification('Successfully signed out', 'info');
        } catch (error) {
            console.error('Sign out error:', error);
            this.showNotification('Sign out failed', 'error');
        }
    }

    /**
     * Update authentication UI based on user state
     */
    updateAuthenticationUI(isSignedIn, user = null) {
        // Update premium header if available
        if (window.premiumHeader) {
            window.premiumHeader.setUser(isSignedIn ? user : null);
        }
        
        const signedOutState = document.getElementById('signed-out-state');
        const signedInState = document.getElementById('signed-in-state');
        const userEmail = document.getElementById('user-email');
        const userTier = document.getElementById('user-tier');

        if (isSignedIn && user) {
            signedOutState?.classList.add('hidden');
            signedInState?.classList.remove('hidden');
            
            if (userEmail) {
                userEmail.textContent = user.email || user.user?.email || 'User';
            }
            
            if (userTier) {
                const tier = user.subscription_tier || user.tier || user.user_metadata?.tier || user.app_metadata?.tier || 'free';
                const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
                userTier.textContent = displayTier;
                userTier.className = `tier-badge tier-${tier.toLowerCase()}`;
                
                // Apply proper styling for PRO tier
                if (tier.toLowerCase() === 'pro') {
                    userTier.style.cssText = `
                        background-color: #10b981 !important;
                        color: white !important;
                        padding: 0.25rem 0.5rem !important;
                        border-radius: 0.25rem !important;
                        font-size: 0.75rem !important;
                        font-weight: 600 !important;
                        display: inline-block !important;
                    `;
                }
            }
            
            // Initialize PaymentManager when user signs in
            this.initializePaymentManager(user);
        } else {
            signedOutState?.classList.remove('hidden');
            signedInState?.classList.add('hidden');
        }
    }

    /**
     * Initialize PaymentManager with user authentication
     */
    async initializePaymentManager(user) {
        if (window.paymentManager) {
            try {
                // Get real auth token from Supabase session
                let authToken = 'local-auth-token'; // fallback
                
                if (window.authService && window.authService.supabase) {
                    // Try to get current session from Supabase
                    const { data: { session } } = await window.authService.supabase.auth.getSession();
                    if (session && session.access_token) {
                        authToken = session.access_token;
                        console.log('✅ Using Supabase access token for payments');
                    }
                } else if (user.access_token) {
                    authToken = user.access_token;
                } else if (user.session?.access_token) {
                    authToken = user.session.access_token;
                }
                
                await window.paymentManager.initialize(authToken);
                console.log('✅ PaymentManager initialized for user:', user.email);
            } catch (error) {
                console.error('❌ PaymentManager initialization failed:', error);
            }
        } else {
            console.warn('⚠️ PaymentManager not available');
        }
    }

    /**
     * Initialize Pro Engine status monitoring
     */
    initializeProEngineStatusMonitoring() {
        console.log('⚙️ Initializing Pro Engine status monitoring');
        
        if (this.proEngineInterface) {
            // Initial status check
            this.updateProEngineStatus();
            
            // Periodic status checks every 5 minutes (reduced frequency)
            setInterval(() => {
                this.updateProEngineStatus();
            }, 300000);
        }
    }

    /**
     * Update Pro Engine status in UI
     */
    async updateProEngineStatus() {
        const statusCircle = document.getElementById('status-circle');
        const statusText = statusCircle?.nextElementSibling;
        
        if (!statusCircle || !statusText) return;

        try {
            // Set checking state
            statusCircle.className = 'status-circle checking';
            statusText.textContent = 'Checking...';

            // Check availability
            const isAvailable = await this.proEngineInterface.checkAvailability();
            
            if (isAvailable) {
                statusCircle.className = 'status-circle online';
                statusText.textContent = 'Pro Engine Ready';
            } else {
                statusCircle.className = 'status-circle';
                statusText.textContent = 'Pro Engine Offline';
            }
        } catch (error) {
            console.error('Pro Engine status check failed:', error);
            statusCircle.className = 'status-circle';
            statusText.textContent = 'Pro Engine Error';
        }
    }

    monitorProEngineStatus() {
        const statusCircle = document.getElementById('status-circle');
        const statusText = statusCircle?.nextElementSibling;
        
        if (statusCircle && statusText) {
            // Set initial status
            statusCircle.style.color = '#22c55e'; // Green
            statusText.textContent = 'Pro Engine Active';
            
            // You could add real status monitoring here
        }
    }

    // Legacy compatibility methods
    showNotification(message, type = 'info') {
        this.presentationManager.showNotification(message, type);
    }

    /**
     * Get custom filename for API processing
     * Required by ProEngine interface
     */
    getCustomFilenameForAPI() {
        // Generate timestamp-based filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const randomId = Math.random().toString(36).substr(2, 6);
        return `enhanced_${timestamp}_${randomId}`;
    }

    /**
     * Get custom location for API processing
     * Required by ProEngine interface
     */
    getCustomLocationForAPI() {
        return this.getDownloadLocation();
    }

    /**
     * Get current processing settings
     * Used by ProEngine for configuration
     */
    getCurrentSettings() {
        // Use dynamic sidebar generator for settings
        if (window.dynamicSidebarGenerator) {
            const settings = window.dynamicSidebarGenerator.getSettings();
            return {
                scaleFactor: parseInt(settings.scaleFactor),
                outputFormat: settings.outputFormat,
                aiEnhancement: settings.enhancementType !== 'pure-upscaling',
                enhancementType: settings.enhancementType,
                faceEnhancement: false, // TODO: Add face enhancement toggle if needed
                artifactRemoval: settings.artifactRemoval,
                quality: 95
            };
        }
        
        // Fallback to direct DOM access if dynamic generator not available
        const scaleFactor = document.getElementById('scale-factor')?.value || '2x';
        const outputFormat = document.getElementById('output-format')?.value || 'jpeg';
        const aiEnhancement = document.getElementById('ai-enhancement-toggle')?.checked || true;
        const enhancementType = document.getElementById('enhancement-type')?.value || 'super-resolution';
        const faceEnhancement = document.getElementById('face-enhancement-toggle')?.checked || false;
        const artifactRemoval = document.getElementById('artifact-removal-toggle')?.checked || false;
        
        return {
            scaleFactor: parseInt(scaleFactor),
            outputFormat,
            aiEnhancement,
            enhancementType,
            faceEnhancement,
            artifactRemoval,
            quality: 95
        };
    }

    /**
     * Get download location
     * Used by file operations
     */
    getDownloadLocation() {
        return this.presentationManager?.getDownloadLocation() || 'Downloads/ProUpscaler';
    }

    /**
     * Set processing status in premium header
     */
    setProcessingStatus(isProcessing) {
        if (window.premiumHeader) {
            window.premiumHeader.setProcessingState(isProcessing);
        }
    }

    /**
     * Set Pro Engine status in premium header
     */
    setProEngineStatus(status, message) {
        if (window.premiumHeader) {
            window.premiumHeader.setEngineStatus(status, message);
        }
    }

    /**
     * Set download button state in premium header
     */
    setDownloadEnabled(enabled) {
        if (window.premiumHeader) {
            window.premiumHeader.setDownloadEnabled(enabled);
        }
    }

    /**
     * Initialize Enhancement Type dropdown functionality
     */
    initializeAIEnhancementToggle() {
        console.log('🤖 Initializing Enhancement Type dropdown...');
        
        setTimeout(() => {
            const enhancementSelect = document.getElementById('enhancement-type');
            const aiToggle = document.getElementById('ai-enhancement-toggle'); // Hidden compatibility checkbox
            
            if (enhancementSelect) {
                console.log('✅ Enhancement Type dropdown found');
                
                // Update compatibility checkbox based on dropdown value
                const updateCompatibilityCheckbox = () => {
                    const value = enhancementSelect.value;
                    // Set checkbox to true for any enhancement type except pure-upscaling
                    aiToggle.checked = value !== 'pure-upscaling';
                    console.log(`🎛️ Enhancement Type: ${value} (AI Enhancement: ${aiToggle.checked ? 'ON' : 'OFF'})`);
                    
                    // Additional debugging for processing path
                    if (value === 'pure-upscaling') {
                        console.log('🔧 Will use: Pure upscaling (no AI)');
                    } else if (value === 'super-resolution') {
                        console.log('🤖 Will use: Super resolution AI enhancement');
                    } else if (value === 'face-enhancement') {
                        console.log('🎭 Will use: Face-specific AI enhancement');
                    }
                };
                
                // Set initial state
                updateCompatibilityCheckbox();
                
                // Add change handler to dropdown
                enhancementSelect.addEventListener('change', (e) => {
                    updateCompatibilityCheckbox();
                    
                    // Dispatch change event on the hidden checkbox for backward compatibility
                    aiToggle.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    console.log(`🔄 Enhancement type changed to: ${e.target.value}`);
                });
                
                console.log('✅ Enhancement Type dropdown functionality initialized');
            } else {
                console.log('❌ Enhancement Type dropdown not found, retrying...');
                setTimeout(() => this.initializeAIEnhancementToggle(), 1000);
            }
        }, 100);
    }

    cleanup() {
        console.log('🧹 Cleaning up Enterprise Pro Upscaler');
    }
}

// Initialize the enterprise app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EnterpriseProUpscalerApp();
});

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.app && typeof window.app.cleanup === 'function') {
        window.app.cleanup();
    }
});


