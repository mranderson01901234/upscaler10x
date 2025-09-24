/**
 * Payment Manager
 * Handles subscription upgrades, billing portal, and payment UI
 */

class PaymentManager {
    constructor() {
        // Payment API runs on port 3002, while client runs on 8080
        this.baseUrl = 'http://localhost:3002';
        this.currentUser = null;
        this.subscriptionTiers = null;
        this.stripeModal = null;
        
        console.log('💳 Payment Manager initialized with API base:', this.baseUrl);
    }

    /**
     * Initialize payment manager with user authentication
     */
    async initialize(authToken) {
        this.authToken = authToken;
        
        try {
            await this.loadSubscriptionTiers();
            await this.loadCurrentSubscription();
            this.setupPaymentUI();
            
            // Initialize Stripe modal
            if (window.StripeModal) {
                this.stripeModal = new StripeModal(this);
            }
            
            console.log('✅ Payment Manager ready');
        } catch (error) {
            console.error('Payment Manager initialization failed:', error);
            // Still setup UI even if API calls fail
            this.setupPaymentUI();
            
            // Try to initialize Stripe modal anyway
            if (window.StripeModal) {
                this.stripeModal = new StripeModal(this);
            }
        }
    }

    /**
     * Load available subscription tiers
     */
    async loadSubscriptionTiers() {
        try {
            const response = await fetch(`${this.baseUrl}/api/payments/tiers`);
            const data = await response.json();
            
            if (response.ok) {
                this.subscriptionTiers = data.tiers;
                console.log('📋 Loaded subscription tiers:', this.subscriptionTiers);
            } else {
                throw new Error(data.error || 'Failed to load tiers');
            }
        } catch (error) {
            console.error('Failed to load subscription tiers:', error);
            throw error;
        }
    }

    /**
     * Load current user subscription status
     */
    async loadCurrentSubscription() {
        try {
            const response = await fetch(`${this.baseUrl}/api/payments/subscription`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentSubscription = data;
                console.log('👤 Current subscription:', this.currentSubscription);
            } else {
                // If subscription API fails, create a default subscription object
                console.warn('Subscription API failed, using default:', data.message);
                this.currentSubscription = {
                    subscription_tier: 'free',
                    subscription_status: 'active',
                    user_email: 'dparker918@yahoo.com'
                };
            }
        } catch (error) {
            console.warn('Failed to load current subscription, using default:', error.message);
            // Fallback to default subscription
            this.currentSubscription = {
                subscription_tier: 'free',
                subscription_status: 'active',
                user_email: 'dparker918@yahoo.com'
            };
        }
    }

    /**
     * Create checkout session for subscription upgrade
     */
    async upgradeSubscription(tier) {
        try {
            // Find the tier data
            const tierData = this.subscriptionTiers.find(t => t.name.toLowerCase() === tier.toLowerCase());
            if (!tierData) {
                throw new Error('Invalid subscription tier');
            }
            
            // Use integrated Stripe modal if available
            if (this.stripeModal) {
                console.log('🚀 Opening integrated Stripe payment modal for:', tier);
                this.closeSubscriptionModal(); // Close the tier selection modal
                this.stripeModal.showModal(tierData);
                return;
            }
            
            // Fallback to redirect method if modal not available
            console.log('⚠️ Stripe modal not available, using redirect method...');
            
            // Try authenticated endpoint first
            let response = await fetch(`${this.baseUrl}/api/payments/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    tier: tier,
                    success_url: `${window.location.origin}/subscription-success`,
                    cancel_url: `${window.location.origin}/subscription-canceled`
                })
            });
            
            let data = await response.json();
            
            // If auth fails, try test endpoint
            if (!response.ok && (data.message === 'Invalid or expired token' || data.message === 'Access token required')) {
                console.log('🧪 Authentication failed, trying test endpoint...');
                response = await fetch(`${this.baseUrl}/api/payments/test-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        tier: tier,
                        success_url: `${window.location.origin}/subscription-success`,
                        cancel_url: `${window.location.origin}/subscription-canceled`
                    })
                });
                
                data = await response.json();
            }
            
            if (response.ok) {
                // Redirect to Stripe checkout
                console.log('🚀 Redirecting to Stripe checkout:', data.checkout_url);
                window.location.href = data.checkout_url;
            } else {
                throw new Error(data.error || data.details || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Subscription upgrade failed:', error);
            this.showError(`Failed to start subscription upgrade: ${error.message}`);
        }
    }

    /**
     * Open billing portal for subscription management
     */
    async openBillingPortal() {
        try {
            const response = await fetch(`${this.baseUrl}/api/payments/create-billing-portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    return_url: `${this.baseUrl}/dashboard`
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Redirect to Stripe billing portal
                window.location.href = data.portal_url;
            } else {
                throw new Error(data.error || 'Failed to create billing portal session');
            }
        } catch (error) {
            console.error('Billing portal failed:', error);
            this.showError('Failed to open billing portal. Please try again.');
        }
    }

    /**
     * Cancel current subscription
     */
    async cancelSubscription() {
        if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period.')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/api/payments/cancel-subscription`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Subscription canceled. You will retain access until ${new Date(data.current_period_end).toLocaleDateString()}.`);
                await this.loadCurrentSubscription();
                this.updateSubscriptionUI();
            } else {
                throw new Error(data.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Subscription cancellation failed:', error);
            this.showError('Failed to cancel subscription. Please try again.');
        }
    }

    /**
     * Setup payment UI components
     */
    setupPaymentUI() {
        this.createSubscriptionModal();
        this.updateSubscriptionUI();
        this.attachEventListeners();
    }

    /**
     * Create subscription upgrade modal
     */
    createSubscriptionModal() {
        const modalHTML = `
            <div id="subscription-modal" class="subscription-modal" style="display: none;">
                <div class="subscription-modal-overlay"></div>
                <div class="subscription-modal-content">
                    <div class="subscription-modal-header">
                        <h2>Choose Your Plan</h2>
                        <button class="close-modal" type="button">&times;</button>
                    </div>
                    <div class="subscription-modal-body">
                        <div id="subscription-tiers" class="subscription-tiers-grid"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add beautiful modal styles
        const styles = `
            .subscription-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: modalFadeIn 0.3s ease-out;
            }
            
            .subscription-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(4px);
            }
            
            .subscription-modal-content {
                position: relative;
                background: hsl(222.2 84% 4.9%);
                border: 1px solid hsl(217.2 32.6% 17.5%);
                border-radius: 12px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                animation: modalSlideIn 0.3s ease-out;
            }
            
            .subscription-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid hsl(217.2 32.6% 17.5%);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, hsl(222.2 84% 4.9%) 0%, hsl(217.2 32.6% 17.5%) 100%);
                border-radius: 12px 12px 0 0;
            }
            
            .subscription-modal-header h2 {
                color: hsl(210 40% 98%);
                font-size: 24px;
                font-weight: 700;
                margin: 0;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .close-modal {
                background: none;
                border: none;
                color: hsl(215 20.2% 65.1%);
                font-size: 28px;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: all 0.2s ease;
                line-height: 1;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-modal:hover {
                background: hsl(217.2 32.6% 17.5%);
                color: hsl(210 40% 98%);
                transform: scale(1.1);
            }
            
            .subscription-modal-body {
                padding: 24px;
            }
            
            .subscription-tiers-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                max-width: 750px;
                margin: 0 auto;
            }
            
            .tier-card {
                background: hsl(217.2 32.6% 17.5%);
                border: 2px solid hsl(217.2 32.6% 17.5%);
                border-radius: 16px;
                padding: 24px 20px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            
            .tier-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .tier-card:hover {
                border-color: #3b82f6;
                transform: translateY(-4px);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            }
            
            .tier-card:hover::before {
                opacity: 1;
            }
            
            .tier-card.current {
                border-color: #10b981;
                background: linear-gradient(135deg, hsl(217.2 32.6% 17.5%) 0%, rgba(16, 185, 129, 0.1) 100%);
                position: relative;
            }
            
            .tier-card.current::before {
                opacity: 1;
                background: linear-gradient(90deg, #10b981, #059669);
            }
            
            .tier-card.current::after {
                content: 'CURRENT';
                position: absolute;
                top: 16px;
                right: 16px;
                background: #10b981;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            
            .tier-name {
                font-size: 24px;
                font-weight: 700;
                color: hsl(210 40% 98%);
                margin: 0 0 8px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .tier-price {
                font-size: 32px;
                font-weight: 800;
                color: #3b82f6;
                margin: 0 0 20px 0;
                display: flex;
                align-items: baseline;
                gap: 8px;
            }
            
            .tier-price::after {
                content: '/month';
                font-size: 16px;
                font-weight: 400;
                color: hsl(215 20.2% 65.1%);
            }
            
            .tier-features {
                list-style: none;
                padding: 0;
                margin: 0 0 20px 0;
                flex-grow: 1;
            }
            
            .tier-features li {
                padding: 8px 0;
                position: relative;
                padding-left: 28px;
                color: hsl(210 40% 98%);
                font-size: 14px;
                line-height: 1.4;
            }
            
            .tier-features li::before {
                content: "✓";
                position: absolute;
                left: 0;
                top: 8px;
                color: #10b981;
                font-weight: 700;
                font-size: 16px;
                width: 20px;
                height: 20px;
                background: rgba(16, 185, 129, 0.1);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .upgrade-btn {
                width: 100%;
                padding: 14px 20px;
                font-size: 14px;
                font-weight: 600;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                position: relative;
                overflow: hidden;
                margin-top: auto;
            }
            
            .upgrade-btn:not(:disabled) {
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: white;
            }
            
            .upgrade-btn:not(:disabled):hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
            }
            
            .upgrade-btn:not(:disabled):active {
                transform: translateY(0);
            }
            
            .upgrade-btn:disabled {
                background: hsl(217.2 32.6% 17.5%);
                color: hsl(215 20.2% 65.1%);
                cursor: not-allowed;
                border: 2px solid #10b981;
            }
            
            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes modalSlideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-50px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @media (max-width: 1024px) {
                .subscription-tiers-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .subscription-modal-content {
                    width: 95%;
                    margin: 20px;
                }
            }
            
            @media (max-width: 768px) {
                .subscription-modal-content {
                    width: 98%;
                    margin: 10px;
                }
                
                .subscription-modal-header {
                    padding: 20px 24px;
                }
                
                .subscription-modal-body {
                    padding: 24px 20px;
                }
                
                .tier-card {
                    padding: 24px 20px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Update subscription UI based on current status
     */
    updateSubscriptionUI() {
        if (!this.subscriptionTiers || !this.currentSubscription) return;
        
        const tiersContainer = document.getElementById('subscription-tiers');
        if (!tiersContainer) return;
        
        tiersContainer.innerHTML = '';
        
        // Filter out admin tier and only show free, basic, pro
        const displayTiers = this.subscriptionTiers.filter(tier => 
            ['free', 'basic', 'pro'].includes(tier.name.toLowerCase())
        );
        
        displayTiers.forEach(tier => {
            const isCurrent = tier.name === this.currentSubscription.subscription_tier;
            const isUpgrade = this.getTierLevel(tier.name) > this.getTierLevel(this.currentSubscription.subscription_tier);
            
            const tierCard = document.createElement('div');
            tierCard.className = `tier-card ${isCurrent ? 'current' : ''}`;
            
            tierCard.innerHTML = `
                <div class="tier-name">${tier.name}</div>
                <div class="tier-price">$${tier.price_monthly}</div>
                <ul class="tier-features">
                    ${tier.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                ${isCurrent ? 
                    '<button class="upgrade-btn" disabled>Current Plan</button>' :
                    isUpgrade ?
                        `<button class="upgrade-btn" onclick="paymentManager.upgradeSubscription('${tier.name}')">Upgrade to ${tier.name}</button>` :
                        '<button class="upgrade-btn" disabled>Contact Support</button>'
                }
            `;
            
            tiersContainer.appendChild(tierCard);
        });
    }

    /**
     * Get tier level for comparison
     */
    getTierLevel(tierName) {
        const levels = { free: 0, basic: 1, pro: 2, admin: 3 };
        return levels[tierName] || 0;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || 
                e.target.classList.contains('subscription-modal-overlay') ||
                e.target.id === 'subscription-modal') {
                this.closeSubscriptionModal();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSubscriptionModal();
            }
        });
    }

    /**
     * Show subscription modal
     */
    showSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Close subscription modal
     */
    closeSubscriptionModal() {
        const modal = document.getElementById('subscription-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // You can customize this to use your preferred notification system
        alert(`✅ ${message}`);
    }

    /**
     * Show error message
     */
    showError(message) {
        // You can customize this to use your preferred notification system
        alert(`❌ ${message}`);
    }
}

// Global instance
const paymentManager = new PaymentManager();
window.paymentManager = paymentManager; 