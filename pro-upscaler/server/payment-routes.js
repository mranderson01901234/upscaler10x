/**
 * Payment API Routes
 * Handles subscription upgrades, billing, and payment webhooks
 */

const express = require('express');
const StripePaymentService = require('./stripe-payment-service');

class PaymentRoutes {
    constructor(authMiddleware) {
        this.router = express.Router();
        this.authMiddleware = authMiddleware;
        this.paymentService = new StripePaymentService();
        this.setupRoutes();
    }

    setupRoutes() {
        // Get current subscription status
        this.router.get('/subscription', this.authMiddleware.authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const subscription = await this.paymentService.getUserSubscription(userId);
                
                if (!subscription) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                res.json({
                    subscription_tier: subscription.subscription_tier,
                    is_active: subscription.is_active,
                    current_period_end: subscription.current_period_end,
                    stripe_subscription: subscription.stripe_subscription ? {
                        id: subscription.stripe_subscription.id,
                        status: subscription.stripe_subscription.status,
                        cancel_at_period_end: subscription.stripe_subscription.cancel_at_period_end
                    } : null
                });
            } catch (error) {
                console.error('Subscription status error:', error);
                res.status(500).json({ error: 'Failed to get subscription status' });
            }
        });

        // Create checkout session for upgrade
        this.router.post('/create-checkout-session', this.authMiddleware.authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const { tier, success_url, cancel_url } = req.body;
                
                if (!tier || !['basic', 'pro'].includes(tier)) {
                    return res.status(400).json({ error: 'Invalid subscription tier' });
                }
                
                const priceId = this.paymentService.priceIds[tier];
                if (!priceId) {
                    return res.status(400).json({ error: 'Price ID not configured for tier' });
                }
                
                const session = await this.paymentService.createCheckoutSession(
                    userId,
                    priceId,
                    success_url || `${req.protocol}://${req.get('host')}/subscription-success`,
                    cancel_url || `${req.protocol}://${req.get('host')}/subscription-canceled`
                );
                
                res.json({
                    checkout_url: session.url,
                    session_id: session.id
                });
            } catch (error) {
                console.error('Checkout session creation error:', error);
                res.status(500).json({ error: 'Failed to create checkout session' });
            }
        });

        // Test checkout session (no auth required for testing)
        this.router.post('/test-checkout-session', async (req, res) => {
            try {
                const { tier, success_url, cancel_url } = req.body;
                
                if (!tier || !['basic', 'pro'].includes(tier)) {
                    return res.status(400).json({ error: 'Invalid subscription tier' });
                }
                
                const priceId = this.paymentService.priceIds[tier];
                if (!priceId) {
                    return res.status(400).json({ error: 'Price ID not configured for tier' });
                }
                
                // Use the test method that doesn't require database lookup
                const session = await this.paymentService.createTestCheckoutSession(
                    priceId,
                    success_url || `${req.protocol}://${req.get('host')}/subscription-success`,
                    cancel_url || `${req.protocol}://${req.get('host')}/subscription-canceled`
                );
                
                res.json({
                    checkout_url: session.url,
                    session_id: session.id
                });
            } catch (error) {
                console.error('Test checkout session creation error:', error);
                res.status(500).json({ error: 'Failed to create test checkout session', details: error.message });
            }
        });

        // Create billing portal session
        this.router.post('/create-billing-portal', this.authMiddleware.authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const { return_url } = req.body;
                
                const session = await this.paymentService.createBillingPortalSession(
                    userId,
                    return_url || `${req.protocol}://${req.get('host')}/dashboard`
                );
                
                res.json({
                    portal_url: session.url
                });
            } catch (error) {
                console.error('Billing portal creation error:', error);
                res.status(500).json({ error: 'Failed to create billing portal session' });
            }
        });

        // Cancel subscription
        this.router.post('/cancel-subscription', this.authMiddleware.authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const subscription = await this.paymentService.cancelSubscription(userId);
                
                res.json({
                    message: 'Subscription will be canceled at the end of the current period',
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    current_period_end: new Date(subscription.current_period_end * 1000)
                });
            } catch (error) {
                console.error('Subscription cancellation error:', error);
                res.status(500).json({ error: 'Failed to cancel subscription' });
            }
        });

        // Stripe webhook endpoint
        this.router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
            try {
                const signature = req.headers['stripe-signature'];
                await this.paymentService.handleWebhook(req.body, signature);
                res.json({ received: true });
            } catch (error) {
                console.error('Webhook processing error:', error);
                res.status(400).json({ error: 'Webhook processing failed' });
            }
        });

        // Create subscription with payment method (for integrated modal)
        this.router.post('/create-subscription', this.authMiddleware.authenticateToken, async (req, res) => {
            try {
                const userId = req.user.id;
                const { payment_method_id, tier, email } = req.body;
                
                if (!payment_method_id || !tier || !['basic', 'pro'].includes(tier)) {
                    return res.status(400).json({ error: 'Invalid parameters' });
                }
                
                const priceId = this.paymentService.priceIds[tier];
                if (!priceId) {
                    return res.status(400).json({ error: 'Price ID not configured for tier' });
                }
                
                // Create subscription with payment method
                const result = await this.paymentService.createSubscriptionWithPaymentMethod(
                    userId,
                    payment_method_id,
                    priceId,
                    email
                );
                
                res.json(result);
            } catch (error) {
                console.error('Subscription creation error:', error);
                res.status(500).json({ error: 'Failed to create subscription', details: error.message });
            }
        });

        // Get subscription tiers and pricing
        this.router.get('/tiers', async (req, res) => {
            try {
                // Get tiers from Supabase
                const { data: tiers, error } = await this.paymentService.supabase
                    .from('subscription_tiers')
                    .select('*')
                    .order('price_monthly');
                    
                if (error) {
                    throw error;
                }
                
                res.json({
                    tiers: tiers.map(tier => ({
                        name: tier.tier_name,
                        price_monthly: tier.price_monthly,
                        max_2x_4x: tier.max_2x_4x,
                        max_8x: tier.max_8x,
                        max_ai_enhancements: tier.max_ai_enhancements,
                        features: this.getTierFeatures(tier.tier_name)
                    }))
                });
            } catch (error) {
                console.error('Tiers fetch error:', error);
                res.status(500).json({ error: 'Failed to fetch subscription tiers' });
            }
        });
    }

    getTierFeatures(tierName) {
        const features = {
            free: [
                '2x and 4x upscaling',
                'Basic image processing',
                'Limited AI enhancements (5/month)',
                'Standard support'
            ],
            basic: [
                'All free features',
                'Up to 8x upscaling',
                'Unlimited 2x-8x processing',
                'AI enhancements (50/month)',
                'Priority support'
            ],
            pro: [
                'All basic features',
                'Up to 15x upscaling',
                'Unlimited processing',
                'Unlimited AI enhancements',
                'Premium support',
                'Early access to new features'
            ],
            admin: [
                'All pro features',
                'Administrative access',
                'Usage analytics',
                'System management'
            ]
        };
        
        return features[tierName] || [];
    }

    getRouter() {
        return this.router;
    }
}

module.exports = PaymentRoutes; 