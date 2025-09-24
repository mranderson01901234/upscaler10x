/**
 * Stripe Payment Modal
 * Integrated Stripe Elements payment form for subscription upgrades
 */

class StripeModal {
    constructor(paymentManager) {
        this.paymentManager = paymentManager;
        this.stripe = null;
        this.elements = null;
        this.card = null;
        this.isProcessing = false;
        this.selectedTier = null;
        
        // Stripe publishable key - You need to replace this with your actual Stripe publishable key
        // Get it from: https://dashboard.stripe.com/test/apikeys
        this.stripePublishableKey = 'pk_test_51RpmSNCg03i5TOI3VHhWoLfIl8LCvqgO5kXUPaHfAhJ8NtTRNGjnILUbM5l8p8rEDpzNrGKmhIYfLM7mZRKu4KYV00kqPcLgdj';
        
        this.init();
    }

    async init() {
        try {
            console.log('🔧 Initializing Stripe Modal...');
            
            // Load Stripe.js
            if (!window.Stripe) {
                console.log('📦 Loading Stripe.js...');
                await this.loadStripeJS();
            }
            
            if (!window.Stripe) {
                throw new Error('Stripe.js failed to load');
            }
            
            console.log('🔧 Creating Stripe instance...');
            // Initialize Stripe
            this.stripe = Stripe(this.stripePublishableKey);
            
            if (!this.stripe) {
                throw new Error('Failed to create Stripe instance');
            }
            
            console.log('🔧 Creating Stripe Elements...');
            // Use basic elements without complex appearance customization
            this.elements = this.stripe.elements();
            
            if (!this.elements) {
                throw new Error('Failed to create Stripe Elements');
            }
            
            console.log('🔧 Creating modal DOM...');
            this.createModal();
            console.log('✅ Stripe Modal initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Stripe Modal:', error);
            // Still create the modal DOM for fallback
            try {
                this.createModal();
            } catch (modalError) {
                console.error('❌ Failed to create modal DOM:', modalError);
            }
        }
    }

    async loadStripeJS() {
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[src*="js.stripe.com"]')) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createModal() {
        const modalHTML = `
            <div id="stripe-payment-modal" class="stripe-modal" style="display: none;">
                <div class="stripe-modal-overlay"></div>
                <div class="stripe-modal-content">
                    <div class="stripe-modal-header">
                        <h2>Complete Your Upgrade</h2>
                        <button class="close-stripe-modal" type="button">&times;</button>
                    </div>
                    <div class="stripe-modal-body">
                        <div class="selected-plan-info">
                            <div class="plan-details">
                                <div class="plan-name" id="selected-plan-name">Pro Plan</div>
                                <div class="plan-price" id="selected-plan-price">$19.99/month</div>
                            </div>
                        </div>
                        
                        <div class="payment-form-container">
                            <form id="stripe-payment-form" autocomplete="off">
                                <!-- Hidden inputs to confuse autofill -->
                                <input type="text" style="display:none" autocomplete="username">
                                <input type="password" style="display:none" autocomplete="current-password">
                                
                                <div class="form-section">
                                    <label for="email">Email</label>
                                    <input type="email" id="email" name="email" required placeholder="your@email.com" autocomplete="new-email">
                                </div>
                                
                                <div class="form-section">
                                    <label for="card-element">Card Information</label>
                                    <div id="card-element" class="stripe-element">
                                        <!-- Stripe Elements will create form elements here -->
                                    </div>
                                    <div id="card-errors" role="alert" class="error-message"></div>
                                    <div class="card-info-hint">
                                        <small>Use test card: 4242 4242 4242 4242</small>
                                    </div>
                                </div>
                                
                                <div class="form-section">
                                    <div class="secure-payment-info">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                        </svg>
                                        <span>Your payment information is secure and encrypted</span>
                                    </div>
                                </div>
                                
                                <button type="submit" id="submit-payment" class="stripe-submit-btn">
                                    <span class="btn-text">Start Subscription</span>
                                    <span class="btn-spinner" style="display: none;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                            </circle>
                                        </svg>
                                        Processing...
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.addStyles();
        this.attachEventListeners();
    }

    addStyles() {
        const styles = `
            .stripe-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: modalFadeIn 0.3s ease-out;
            }
            
            .stripe-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(6px);
            }
            
            .stripe-modal-content {
                position: relative;
                background: hsl(222.2 84% 4.9%);
                border: 1px solid hsl(217.2 32.6% 17.5%);
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
                animation: modalSlideIn 0.3s ease-out;
            }
            
            .stripe-modal-header {
                padding: 24px;
                border-bottom: 1px solid hsl(217.2 32.6% 17.5%);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, hsl(222.2 84% 4.9%) 0%, hsl(217.2 32.6% 17.5%) 100%);
                border-radius: 16px 16px 0 0;
            }
            
            .stripe-modal-header h2 {
                color: hsl(210 40% 98%);
                font-size: 20px;
                font-weight: 600;
                margin: 0;
            }
            
            .close-stripe-modal {
                background: none;
                border: none;
                color: hsl(215 20.2% 65.1%);
                font-size: 24px;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: all 0.2s ease;
                line-height: 1;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-stripe-modal:hover {
                background: hsl(217.2 32.6% 17.5%);
                color: hsl(210 40% 98%);
            }
            
            .stripe-modal-body {
                padding: 24px;
            }
            
            .selected-plan-info {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 24px;
            }
            
            .plan-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .plan-name {
                font-size: 18px;
                font-weight: 600;
                color: hsl(210 40% 98%);
            }
            
            .plan-price {
                font-size: 20px;
                font-weight: 700;
                color: hsl(var(--primary));
            }
            
            .payment-form-container {
                background: hsl(217.2 32.6% 17.5%);
                border-radius: 12px;
                padding: 24px;
            }
            
            .form-section {
                margin-bottom: 20px;
            }
            
            .form-section:last-child {
                margin-bottom: 0;
            }
            
            .form-section label {
                display: block;
                margin-bottom: 8px;
                color: hsl(210 40% 98%);
                font-weight: 500;
                font-size: 14px;
            }
            
            .form-section input[type="email"] {
                width: 100%;
                padding: 12px 16px;
                background: hsl(222.2 84% 4.9%);
                border: 1px solid hsl(217.2 32.6% 17.5%);
                border-radius: 8px;
                color: hsl(210 40% 98%);
                font-size: 14px;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }
            
            .form-section input[type="email"]:focus {
                outline: none;
                border-color: hsl(var(--primary));
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            }
            
            .stripe-element {
                padding: 12px 16px;
                background: hsl(var(--background)); /* Darker background for better contrast */
                border: 1px solid hsl(var(--border));
                border-radius: 8px;
                transition: all 0.2s ease;
                min-height: 44px;
                display: flex;
                align-items: center;
                position: relative;
            }
            
            .stripe-element:focus-within {
                border-color: hsl(var(--primary));
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
                background: hsl(var(--background)); /* Ensure background stays dark */
            }
            
            .stripe-element .StripeElement {
                width: 100%;
                color: hsl(var(--foreground)) !important;
            }
            
            .stripe-element .StripeElement--focus {
                box-shadow: none;
            }
            
            .stripe-element .StripeElement--complete {
                color: hsl(var(--success)) !important;
            }
            
            .stripe-element .StripeElement--invalid {
                color: hsl(var(--destructive)) !important;
            }
            
            .error-message {
                color: hsl(var(--destructive));
                font-size: 13px;
                margin-top: 8px;
                display: none;
            }
            
            .error-message.show {
                display: block;
            }
            
            .card-info-hint {
                margin-top: 6px;
            }
            
            .card-info-hint small {
                color: hsl(215 20.2% 65.1%);
                font-size: 12px;
            }
            
            .secure-payment-info {
                display: flex;
                align-items: center;
                gap: 8px;
                color: hsl(215 20.2% 65.1%);
                font-size: 13px;
                justify-content: center;
                margin-top: 16px;
            }
            
            .secure-payment-info svg {
                color: hsl(var(--success));
            }
            
            .stripe-submit-btn {
                width: 100%;
                padding: 16px 24px;
                background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                margin-top: 24px;
                min-height: 56px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .stripe-submit-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
            }
            
            .stripe-submit-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .btn-text, .btn-spinner {
                display: flex;
                align-items: center;
                gap: 8px;
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
            
            @media (max-width: 768px) {
                .stripe-modal-content {
                    width: 95%;
                    margin: 20px;
                }
                
                .stripe-modal-header {
                    padding: 20px;
                }
                
                .stripe-modal-body {
                    padding: 20px;
                }
                
                .payment-form-container {
                    padding: 20px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    attachEventListeners() {
        // Close modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-stripe-modal') || 
                e.target.classList.contains('stripe-modal-overlay') ||
                e.target.id === 'stripe-payment-modal') {
                this.closeModal();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Form submission
        const form = document.getElementById('stripe-payment-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async showModal(tierData) {
        this.selectedTier = tierData;
        
        // Show modal first
        const modal = document.getElementById('stripe-payment-modal');
        if (modal) {
            modal.style.display = 'flex';
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        
        // Wait for modal to be visible, then update content
        setTimeout(() => {
            try {
                // Update plan info
                const planNameEl = document.getElementById('selected-plan-name');
                const planPriceEl = document.getElementById('selected-plan-price');
                
                if (planNameEl) planNameEl.textContent = tierData.name;
                if (planPriceEl) planPriceEl.textContent = `$${tierData.price_monthly}/month`;
                
                // Create card element
                if (this.card) {
                    this.card.destroy();
                    this.card = null;
                }
                
                // Check if Stripe and elements are ready
                if (!this.stripe || !this.elements) {
                    console.error('❌ Stripe not initialized properly');
                    return;
                }
                
                const cardContainer = document.getElementById('card-element');
                if (!cardContainer) {
                    console.error('❌ Card container element not found');
                    return;
                }
                
                console.log('🔧 Creating Stripe card element...');
                this.card = this.elements.create('card', {
                    hidePostalCode: true,
                    disableLink: true, // Disable Link integration that might interfere
                    style: {
                        base: {
                            fontSize: '16px',
                            color: 'hsl(var(--foreground))', // Ensure text is white and visible
                            backgroundColor: 'transparent',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontWeight: '400',
                            lineHeight: '20px',
                            '::placeholder': {
                                color: 'hsl(var(--muted-foreground))',
                                fontWeight: '400',
                            },
                            ':focus': {
                                color: 'hsl(var(--foreground))',
                            },
                            ':hover': {
                                color: 'hsl(var(--foreground))',
                            },
                        },
                        complete: {
                            color: 'hsl(var(--success))', // Green for complete/valid input
                        },
                        empty: {
                            color: 'hsl(var(--foreground))',
                        },
                        invalid: {
                            color: 'hsl(var(--destructive))',
                        },
                    },
                });
                
                console.log('🔧 Mounting card element...');
                this.card.mount('#card-element');
                
                // Clear any browser autofill that might interfere
                this.clearBrowserAutofill();
                
                // Handle real-time validation errors from the card Element
                this.card.on('change', ({error, complete, empty}) => {
                    const displayError = document.getElementById('card-errors');
                    const cardContainer = document.getElementById('card-element');
                    
                    if (displayError) {
                        if (error) {
                            displayError.textContent = error.message;
                            displayError.classList.add('show');
                        } else {
                            displayError.textContent = '';
                            displayError.classList.remove('show');
                        }
                    }
                    
                    // Visual feedback for typing
                    if (cardContainer) {
                        if (complete) {
                            cardContainer.style.borderColor = 'hsl(var(--success))';
                            console.log('✅ Card input is complete and valid');
                        } else if (error) {
                            cardContainer.style.borderColor = 'hsl(var(--destructive))';
                        } else if (!empty) {
                            cardContainer.style.borderColor = 'hsl(var(--primary))';
                            console.log('🔧 User is typing in card field');
                        } else {
                            cardContainer.style.borderColor = 'hsl(var(--border))';
                        }
                    }
                });
                
                this.card.on('ready', () => {
                    console.log('✅ Stripe card element is ready for input');
                    // Clear any autofill interference once ready
                    setTimeout(() => {
                        this.clearBrowserAutofill();
                        this.forceTextVisibility();
                    }, 200);
                });
                
                // Add click handler to card container to clear autofill
                const cardClickContainer = document.getElementById('card-element');
                if (cardClickContainer) {
                    cardClickContainer.addEventListener('click', () => {
                        // Clear any browser-filled data when user clicks
                        if (this.card) {
                            setTimeout(() => {
                                this.card.focus();
                            }, 10);
                        }
                    });
                }
                
                console.log('✅ Stripe modal setup complete');
                
            } catch (error) {
                console.error('❌ Error setting up Stripe modal:', error);
            }
        }, 100);
    }

    clearBrowserAutofill() {
        // Prevent browser autofill from interfering with Stripe Elements
        const form = document.getElementById('stripe-payment-form');
        if (form) {
            // Add autocomplete attributes to prevent interference
            form.setAttribute('autocomplete', 'off');
            
            // Clear any autofilled values that might interfere
            const emailInput = document.getElementById('email');
            if (emailInput && emailInput.value && !emailInput.value.includes('@')) {
                emailInput.value = '';
            }
            
            // Add a small delay to ensure Stripe Elements is not affected by autofill
            setTimeout(() => {
                if (this.card) {
                    this.card.clear();
                }
            }, 50);
        }
    }

    forceTextVisibility() {
        // Force text visibility in Stripe Elements by adding CSS overrides
        const cardContainer = document.getElementById('card-element');
        if (cardContainer) {
            // Add CSS to force text visibility
            const style = document.createElement('style');
            style.textContent = `
                #card-element iframe {
                    color-scheme: dark !important;
                }
                #card-element .StripeElement input,
                #card-element .StripeElement input:focus,
                #card-element .StripeElement input:hover,
                #card-element .StripeElement input::placeholder {
                    color: hsl(var(--foreground)) !important;
                    -webkit-text-fill-color: hsl(var(--foreground)) !important;
                    opacity: 1 !important;
                }
                #card-element .StripeElement {
                    color: hsl(var(--foreground)) !important;
                    -webkit-text-fill-color: hsl(var(--foreground)) !important;
                }
            `;
            
            // Remove any existing override style
            const existingStyle = document.getElementById('stripe-text-visibility');
            if (existingStyle) {
                existingStyle.remove();
            }
            
            style.id = 'stripe-text-visibility';
            document.head.appendChild(style);
            
            console.log('🔧 Applied text visibility CSS overrides');
        }
    }

    closeModal() {
        const modal = document.getElementById('stripe-payment-modal');
        if (modal) {
            modal.style.display = 'none';
            // Restore body scroll
            document.body.style.overflow = '';
        }
        
        if (this.card) {
            this.card.destroy();
            this.card = null;
        }
        
        // Reset form
        const form = document.getElementById('stripe-payment-form');
        if (form) {
            form.reset();
        }
        
        // Clear errors
        const errorElement = document.getElementById('card-errors');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showProcessing(true);
        
        try {
            const email = document.getElementById('email').value;
            
            // Create payment method
            const {error, paymentMethod} = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.card,
                billing_details: {
                    email: email,
                },
            });
            
            if (error) {
                throw new Error(error.message);
            }
            
            // Create subscription via our backend
            await this.createSubscription(paymentMethod.id, email);
            
        } catch (error) {
            console.error('Payment failed:', error);
            this.showError(error.message);
        } finally {
            this.isProcessing = false;
            this.showProcessing(false);
        }
    }

    async createSubscription(paymentMethodId, email) {
        try {
            const response = await fetch(`${this.paymentManager.baseUrl}/api/payments/create-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.paymentManager.authToken}`
                },
                body: JSON.stringify({
                    payment_method_id: paymentMethodId,
                    tier: this.selectedTier.name.toLowerCase(),
                    email: email
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create subscription');
            }
            
            if (data.requires_action) {
                // Handle 3D Secure authentication
                const {error: confirmError} = await this.stripe.confirmCardPayment(data.payment_intent_client_secret);
                
                if (confirmError) {
                    throw new Error(confirmError.message);
                }
            }
            
            // Success!
            this.showSuccess();
            
        } catch (error) {
            throw error;
        }
    }

    showProcessing(show) {
        const submitBtn = document.getElementById('submit-payment');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        if (show) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'flex';
            btnSpinner.style.display = 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('card-errors');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    showSuccess() {
        // Close modal
        this.closeModal();
        
        // Show success message
        this.paymentManager.showSuccess('Subscription upgraded successfully! Welcome to your new plan.');
        
        // Refresh subscription data
        setTimeout(() => {
            this.paymentManager.loadCurrentSubscription();
            this.paymentManager.updateSubscriptionUI();
        }, 1000);
    }
}

// Export for use in payment manager
window.StripeModal = StripeModal; 