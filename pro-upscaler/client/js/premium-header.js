/**
 * Premium Header Management System
 * Handles contextual navigation, user state, and premium UI interactions
 */

class PremiumHeaderManager {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.currentPath = window.location.pathname;
        this.dropdownTimeout = null;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('🎨 Initializing Premium Header...');
        
        this.setupEventListeners();
        this.setupDropdownInteractions();
        this.setupMobileMenu();
        this.updateContextualNavigation();
        this.setupEngineStatusMonitoring();
        
        this.isInitialized = true;
        console.log('✅ Premium Header initialized');
    }

    setupEventListeners() {
        // File upload and download functionality removed from header
        // These actions are now handled through the main interface

        // Auth buttons
        const signinBtn = document.getElementById('signin-button');
        const signupBtn = document.getElementById('signup-button');
        const signoutBtn = document.getElementById('signout-button');

        if (signinBtn) signinBtn.addEventListener('click', () => this.handleSignIn());
        if (signupBtn) signupBtn.addEventListener('click', () => this.handleSignUp());
        if (signoutBtn) signoutBtn.addEventListener('click', () => this.handleSignOut());

        // Dropdown menu items
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleDropdownItemClick(e));
        });

        // Notification button
        const notificationBtn = document.getElementById('notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.handleNotifications());
        }

        // Pricing navigation button
        const pricingNavBtn = document.getElementById('pricing-nav-btn');
        if (pricingNavBtn) {
            pricingNavBtn.addEventListener('click', () => this.handlePricingClick());
        }

        // Window resize for responsive behavior
        window.addEventListener('resize', () => this.handleResize());
        
        // Route change detection
        window.addEventListener('popstate', () => this.handleRouteChange());
    }

    setupDropdownInteractions() {
        const profileTrigger = document.getElementById('profile-trigger');
        const dropdownMenu = document.getElementById('user-dropdown-menu');

        if (!profileTrigger || !dropdownMenu) return;

        // Click to toggle dropdown
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Keyboard navigation
        profileTrigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleDropdown();
            }
            if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });

        // Hover interactions (with delay)
        profileTrigger.addEventListener('mouseenter', () => {
            clearTimeout(this.dropdownTimeout);
            this.dropdownTimeout = setTimeout(() => this.openDropdown(), 300);
        });

        profileTrigger.addEventListener('mouseleave', () => {
            clearTimeout(this.dropdownTimeout);
            this.dropdownTimeout = setTimeout(() => this.closeDropdown(), 500);
        });

        dropdownMenu.addEventListener('mouseenter', () => {
            clearTimeout(this.dropdownTimeout);
        });

        dropdownMenu.addEventListener('mouseleave', () => {
            this.dropdownTimeout = setTimeout(() => this.closeDropdown(), 300);
        });
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-button');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const mobileMenuClose = document.getElementById('mobile-menu-close');

        if (!mobileMenuBtn || !mobileMenuOverlay || !mobileMenuClose) return;

        mobileMenuBtn.addEventListener('click', () => this.openMobileMenu());
        mobileMenuClose.addEventListener('click', () => this.closeMobileMenu());
        
        // Close on overlay click
        mobileMenuOverlay.addEventListener('click', (e) => {
            if (e.target === mobileMenuOverlay) {
                this.closeMobileMenu();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !mobileMenuOverlay.classList.contains('hidden')) {
                this.closeMobileMenu();
            }
        });
    }

    updateContextualNavigation() {
        // Update center navigation active states
        this.updateCenterNavigationStates();
    }

    updateCenterNavigationStates() {
        const currentPage = this.getCurrentPageContext();
        
        // Remove active class from all center nav buttons
        document.querySelectorAll('.center-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to current page button
        if (currentPage === 'dashboard') {
            document.getElementById('dashboard-nav-btn')?.classList.add('active');
        } else if (currentPage === 'main' || currentPage === 'processing') {
            document.getElementById('processing-nav-btn')?.classList.add('active');
        }
    }

    getContextualNavigationItems() {
        const isAuthenticated = !!this.currentUser;
        const isAdmin = this.currentUser?.role === 'admin' || this.currentUser?.app_metadata?.role === 'admin';
        const currentPage = this.getCurrentPageContext();

        let items = [];

        if (isAuthenticated) {
            // Authenticated user navigation
            items = [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    href: 'dashboard.html',
                    icon: this.getIcon('dashboard'),
                    active: currentPage === 'dashboard'
                },
                {
                    id: 'processing',
                    label: 'Processing',
                    href: 'index.html',
                    icon: this.getIcon('processing'),
                    active: currentPage === 'main' || currentPage === 'processing'
                }
            ];

            if (isAdmin) {
                items.push({
                    id: 'admin',
                    label: 'Admin',
                    href: 'admin.html',
                    icon: this.getIcon('admin'),
                    active: currentPage === 'admin'
                });
            }
        } else {
            // Unauthenticated user navigation
            items = [
                {
                    id: 'features',
                    label: 'Features',
                    href: '#features',
                    icon: this.getIcon('features'),
                    active: false
                },
                {
                    id: 'pricing',
                    label: 'Pricing',
                    href: '#pricing',
                    icon: this.getIcon('pricing'),
                    active: false
                }
            ];
        }

        return items;
    }

    createNavigationItem(item) {
        const navItem = document.createElement('a');
        navItem.className = `nav-item ${item.active ? 'active' : ''}`;
        navItem.href = item.href;
        navItem.innerHTML = `
            ${item.icon}
            <span>${item.label}</span>
        `;

        navItem.addEventListener('click', (e) => {
            if (item.href.startsWith('#')) {
                e.preventDefault();
                this.handleSectionNavigation(item.href);
            }
        });

        return navItem;
    }

    getCurrentPageContext() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';

        const pageMap = {
            'index.html': 'main',
            'dashboard.html': 'dashboard',
            'admin.html': 'admin',
            'admin-users.html': 'admin',
            'admin-analytics.html': 'admin'
        };

        return pageMap[filename] || 'main';
    }

    getIcon(type) {
        const icons = {
            dashboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>`,
            processing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>`,
            admin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/>
            </svg>`,
            features: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
            pricing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m-3-9h6m-6 10h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`
        };

        return icons[type] || '';
    }

    setupEngineStatusMonitoring() {
        // Monitor Pro Engine status and update UI accordingly
        this.updateEngineStatus('checking', 'Checking Pro Engine...');
        
        // Check engine status periodically
        this.checkEngineStatus();
        setInterval(() => this.checkEngineStatus(), 30000); // Check every 30 seconds
    }

    async checkEngineStatus() {
        try {
            // Check if ProEngineInterface exists globally
            if (window.proEngineInterface) {
                const isAvailable = await window.proEngineInterface.checkAvailability();
                if (isAvailable) {
                    this.updateEngineStatus('online', 'Pro Engine Ready');
                } else {
                    this.updateEngineStatus('offline', 'Pro Engine Offline');
                }
            } else {
                this.updateEngineStatus('offline', 'Pro Engine Unavailable');
            }
        } catch (error) {
            console.warn('Engine status check failed:', error);
            this.updateEngineStatus('offline', 'Pro Engine Offline');
        }
    }

    updateEngineStatus(status, text) {
        const statusDot = document.getElementById('engine-status-dot');
        const statusText = document.getElementById('engine-status-text');

        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = text;
        }
    }

    // User Authentication Methods
    updateUserState(user) {
        this.currentUser = user;
        this.updateAuthenticationUI(!!user, user);
        this.updateContextualNavigation();
    }

    updateAuthenticationUI(isSignedIn, user = null) {
        const signedOutState = document.getElementById('signed-out-state');
        const signedInState = document.getElementById('signed-in-state');
        const userEmail = document.getElementById('user-email');
        const userTier = document.getElementById('user-tier');
        const avatarText = document.getElementById('avatar-text');
        const dropdownEmail = document.getElementById('dropdown-user-email');
        const dropdownTier = document.getElementById('dropdown-user-tier');

        if (isSignedIn && user) {
            signedOutState?.classList.add('hidden');
            signedInState?.classList.remove('hidden');
            
            const email = user.email || user.user?.email || 'User';
            const tier = user.subscription_tier || user.tier || user.user_metadata?.tier || user.app_metadata?.tier || 'free';
            
            // Update user email displays
            if (userEmail) userEmail.textContent = email;
            if (dropdownEmail) dropdownEmail.textContent = email;
            
            // Update tier displays
            const displayTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
            if (userTier) {
                userTier.textContent = displayTier;
                userTier.className = `tier-badge tier-${tier.toLowerCase()}`;
            }
            if (dropdownTier) {
                dropdownTier.textContent = `${displayTier} Plan`;
            }
            
            // Update avatar
            if (avatarText) {
                avatarText.textContent = email.charAt(0).toUpperCase();
            }

            // Show upgrade prompts if needed
            this.checkUpgradePrompts(user);
        } else {
            signedOutState?.classList.remove('hidden');
            signedInState?.classList.add('hidden');
        }
    }

    checkUpgradePrompts(user) {
        const tier = user.subscription_tier || user.tier || 'free';
        
        // This would integrate with usage tracking
        // For now, we'll show contextual upgrade hints
        if (tier === 'free') {
            // Could show upgrade hints in contextual info area
            this.showContextualInfo('💎 Upgrade to Pro for unlimited processing');
        }
    }

    showContextualInfo(message) {
        const contextualInfo = document.getElementById('contextual-info');
        if (contextualInfo) {
            contextualInfo.innerHTML = `<span>${message}</span>`;
            contextualInfo.style.display = 'flex';
        }
    }

    hideContextualInfo() {
        const contextualInfo = document.getElementById('contextual-info');
        if (contextualInfo) {
            contextualInfo.style.display = 'none';
        }
    }

    // Processing Status Methods
    showProcessingStatus() {
        const processingStatus = document.getElementById('processing-status');
        if (processingStatus) {
            processingStatus.style.display = 'flex';
        }
    }

    hideProcessingStatus() {
        const processingStatus = document.getElementById('processing-status');
        if (processingStatus) {
            processingStatus.style.display = 'none';
        }
    }

    // Dropdown Methods
    toggleDropdown() {
        const dropdown = document.getElementById('user-dropdown-menu');
        const trigger = document.getElementById('profile-trigger');
        
        if (!dropdown || !trigger) return;

        const isOpen = !dropdown.classList.contains('hidden');
        
        if (isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        const dropdown = document.getElementById('user-dropdown-menu');
        const trigger = document.getElementById('profile-trigger');
        
        if (!dropdown || !trigger) return;

        dropdown.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
    }

    closeDropdown() {
        const dropdown = document.getElementById('user-dropdown-menu');
        const trigger = document.getElementById('profile-trigger');
        
        if (!dropdown || !trigger) return;

        dropdown.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
    }

    // Mobile Menu Methods
    openMobileMenu() {
        const overlay = document.getElementById('mobile-menu-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileMenu() {
        const overlay = document.getElementById('mobile-menu-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // Event Handlers
    // File upload and download handlers removed - functionality moved to main interface

    handleSignIn() {
        if (window.authService) {
            window.authService.showSignInModal();
        }
    }

    handleSignUp() {
        if (window.authService) {
            window.authService.showSignUpModal();
        }
    }

    handleSignOut() {
        if (window.authService) {
            window.authService.signOut();
        }
    }

    handleDropdownItemClick(event) {
        const item = event.currentTarget;
        const action = item.id;

        this.closeDropdown();

        switch (action) {
            case 'view-usage':
                this.showUsageModal();
                break;
            case 'manage-subscription':
                this.showSubscriptionModal();
                break;
            case 'account-settings':
                this.showAccountSettings();
                break;
            default:
                // Handle navigation items normally
                break;
        }
    }

    handleNotifications() {
        // Show notifications panel or modal
        console.log('📢 Opening notifications...');
        // This would integrate with a notification system
    }

    handlePricingClick() {
        // Handle pricing button click - could show modal or navigate
        console.log('💰 Opening pricing...');
        if (window.paymentManager) {
            window.paymentManager.showSubscriptionModal();
        } else {
            // Fallback - could show a pricing modal or navigate to pricing page
            console.log('PaymentManager not available, showing basic pricing info');
        }
    }

    handleResize() {
        // Handle responsive behavior changes
        this.updateResponsiveState();
    }

    handleRouteChange() {
        this.currentPath = window.location.pathname;
        this.updateContextualNavigation();
    }

    handleSectionNavigation(href) {
        const section = href.substring(1); // Remove #
        const element = document.getElementById(section);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Modal Methods (placeholders for integration)
    showUsageModal() {
        console.log('📊 Opening usage modal...');
        // Would integrate with usage tracking system
    }

    showSubscriptionModal() {
        console.log('💳 Opening subscription modal...');
        // Would integrate with payment system
    }

    showAccountSettings() {
        console.log('⚙️ Opening account settings...');
        // Would show account settings modal
    }

    updateResponsiveState() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024;
        
        // Update header behavior based on screen size
        if (isMobile) {
            this.hideContextualInfo();
        }
    }

    // Public API Methods
    setProcessingState(isProcessing) {
        if (isProcessing) {
            this.showProcessingStatus();
        } else {
            this.hideProcessingStatus();
        }
    }

    setEngineStatus(status, message) {
        this.updateEngineStatus(status, message);
    }

    setUser(user) {
        this.updateUserState(user);
    }

    showUpgradePrompt(message) {
        this.showContextualInfo(message);
    }

    setDownloadEnabled(enabled) {
        // Download button removed from header - functionality handled in main interface
        // This method is kept for compatibility but does nothing
    }
}

// Initialize the premium header when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.premiumHeader = new PremiumHeaderManager();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PremiumHeaderManager;
} 