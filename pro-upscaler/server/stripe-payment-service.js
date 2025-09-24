/**
 * Stripe Payment Service
 * Handles subscription management, payments, and webhook processing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

class StripePaymentService {
    constructor() {
        this.supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04'
        );
        
        // Stripe Price IDs (your actual Stripe price IDs)
        this.priceIds = {
            basic: 'price_1SAwZvCg03i5TOI3gZQskT5u',     // $9.99/month - Pro Upscaler Basic
            pro: 'price_1SAwbHCg03i5TOI37l4cgaD5',         // $19.99/month - Pro Upscaler Pro
        };
        
        console.log('✅ Stripe Payment Service initialized');
    }

    /**
     * Create a test checkout session (no database required)
     */
    async createTestCheckoutSession(priceId, successUrl, cancelUrl) {
        try {
            // Create checkout session without user lookup
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    test_session: 'true',
                    price_id: priceId
                },
                subscription_data: {
                    metadata: {
                        test_session: 'true'
                    }
                }
            });

            console.log(`✅ Created test checkout session: ${session.id}`);
            return session;
        } catch (error) {
            console.error('Failed to create test checkout session:', error);
            throw error;
        }
    }

    /**
     * Create a new customer in Stripe
     */
    async createStripeCustomer(user) {
        try {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabase_user_id: user.id,
                    subscription_tier: user.profile?.subscription_tier || 'free'
                }
            });
            
            // Store Stripe customer ID in Supabase
            await this.supabase
                .from('user_profiles')
                .update({ stripe_customer_id: customer.id })
                .eq('id', user.id);
                
            console.log(`✅ Created Stripe customer: ${customer.id} for ${user.email}`);
            return customer;
        } catch (error) {
            console.error('Failed to create Stripe customer:', error);
            throw error;
        }
    }

    /**
     * Create a checkout session for subscription upgrade
     */
    async createCheckoutSession(userId, priceId, successUrl, cancelUrl) {
        try {
            // Get user profile
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (!profile) {
                throw new Error('User profile not found');
            }

            // Get or create Stripe customer
            let customerId = profile.stripe_customer_id;
            if (!customerId) {
                const customer = await this.createStripeCustomer({
                    id: userId,
                    email: profile.email || `user-${userId}@example.com`,
                    profile
                });
                customerId = customer.id;
            }

            // Create checkout session
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    supabase_user_id: userId,
                    price_id: priceId
                },
                subscription_data: {
                    metadata: {
                        supabase_user_id: userId
                    }
                }
            });

            console.log(`✅ Created checkout session: ${session.id} for user ${userId}`);
            return session;
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            throw error;
        }
    }

    /**
     * Create a billing portal session for subscription management
     */
    async createBillingPortalSession(userId, returnUrl) {
        try {
            // Get user's Stripe customer ID
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('stripe_customer_id')
                .eq('id', userId)
                .single();
                
            if (!profile?.stripe_customer_id) {
                throw new Error('No Stripe customer found for user');
            }

            const session = await stripe.billingPortal.sessions.create({
                customer: profile.stripe_customer_id,
                return_url: returnUrl,
            });

            console.log(`✅ Created billing portal session for user ${userId}`);
            return session;
        } catch (error) {
            console.error('Failed to create billing portal session:', error);
            throw error;
        }
    }

    /**
     * Handle webhook events from Stripe
     */
    async handleWebhook(rawBody, signature) {
        try {
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            const event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);

            console.log(`📨 Received Stripe webhook: ${event.type}`);

            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                    
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                    
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                    
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                    
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                    
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                    
                default:
                    console.log(`⚠️  Unhandled webhook event: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('Webhook handling failed:', error);
            throw error;
        }
    }

    /**
     * Handle successful checkout completion
     */
    async handleCheckoutCompleted(session) {
        try {
            const userId = session.metadata.supabase_user_id;
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            
            const tierName = this.getTierFromPriceId(subscription.items.data[0].price.id);
            
            // Update user subscription in Supabase
            await this.updateUserSubscription(userId, {
                subscription_tier: tierName,
                stripe_subscription_id: subscription.id,
                subscription_status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            });
            
            console.log(`✅ Checkout completed: User ${userId} upgraded to ${tierName}`);
        } catch (error) {
            console.error('Failed to handle checkout completion:', error);
        }
    }

    /**
     * Handle subscription creation
     */
    async handleSubscriptionCreated(subscription) {
        try {
            const userId = subscription.metadata.supabase_user_id;
            const tierName = this.getTierFromPriceId(subscription.items.data[0].price.id);
            
            await this.updateUserSubscription(userId, {
                subscription_tier: tierName,
                stripe_subscription_id: subscription.id,
                subscription_status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            });
            
            console.log(`✅ Subscription created: User ${userId} - ${tierName}`);
        } catch (error) {
            console.error('Failed to handle subscription creation:', error);
        }
    }

    /**
     * Handle subscription updates (upgrades, downgrades, etc.)
     */
    async handleSubscriptionUpdated(subscription) {
        try {
            const userId = subscription.metadata.supabase_user_id;
            const tierName = this.getTierFromPriceId(subscription.items.data[0].price.id);
            
            await this.updateUserSubscription(userId, {
                subscription_tier: tierName,
                subscription_status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
            });
            
            console.log(`✅ Subscription updated: User ${userId} - ${tierName} (${subscription.status})`);
        } catch (error) {
            console.error('Failed to handle subscription update:', error);
        }
    }

    /**
     * Handle subscription deletion/cancellation
     */
    async handleSubscriptionDeleted(subscription) {
        try {
            const userId = subscription.metadata.supabase_user_id;
            
            await this.updateUserSubscription(userId, {
                subscription_tier: 'free',
                subscription_status: 'canceled',
                stripe_subscription_id: null,
                current_period_end: null
            });
            
            console.log(`✅ Subscription canceled: User ${userId} downgraded to free`);
        } catch (error) {
            console.error('Failed to handle subscription deletion:', error);
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSucceeded(invoice) {
        try {
            if (invoice.subscription) {
                const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                const userId = subscription.metadata.supabase_user_id;
                
                // Log successful payment
                await this.supabase
                    .from('payment_logs')
                    .insert({
                        user_id: userId,
                        stripe_invoice_id: invoice.id,
                        amount: invoice.amount_paid,
                        currency: invoice.currency,
                        status: 'succeeded',
                        payment_date: new Date().toISOString()
                    });
                    
                console.log(`✅ Payment succeeded: User ${userId} - $${invoice.amount_paid / 100}`);
            }
        } catch (error) {
            console.error('Failed to handle payment success:', error);
        }
    }

    /**
     * Handle failed payment
     */
    async handlePaymentFailed(invoice) {
        try {
            if (invoice.subscription) {
                const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                const userId = subscription.metadata.supabase_user_id;
                
                // Log failed payment
                await this.supabase
                    .from('payment_logs')
                    .insert({
                        user_id: userId,
                        stripe_invoice_id: invoice.id,
                        amount: invoice.amount_due,
                        currency: invoice.currency,
                        status: 'failed',
                        payment_date: new Date().toISOString()
                    });
                    
                console.log(`❌ Payment failed: User ${userId} - $${invoice.amount_due / 100}`);
                
                // Optionally downgrade user after multiple failed payments
                // This would require additional logic to track failed payment count
            }
        } catch (error) {
            console.error('Failed to handle payment failure:', error);
        }
    }

    /**
     * Update user subscription in Supabase
     */
    async updateUserSubscription(userId, subscriptionData) {
        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .update({
                    ...subscriptionData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
                
            if (error) {
                throw error;
            }
            
            console.log(`✅ Updated subscription for user ${userId}:`, subscriptionData);
        } catch (error) {
            console.error('Failed to update user subscription:', error);
            throw error;
        }
    }

    /**
     * Get subscription tier name from Stripe price ID
     */
    getTierFromPriceId(priceId) {
        const tierMap = {
            [this.priceIds.basic]: 'basic',
            [this.priceIds.pro]: 'pro',
        };
        return tierMap[priceId] || 'free';
    }

    /**
     * Get user's current subscription status
     */
    async getUserSubscription(userId) {
        try {
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (!profile) {
                return null;
            }

            // If user has a Stripe subscription, get current status
            if (profile.stripe_subscription_id) {
                try {
                    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
                    return {
                        ...profile,
                        stripe_subscription: subscription,
                        is_active: subscription.status === 'active',
                        current_period_end: new Date(subscription.current_period_end * 1000)
                    };
                } catch (error) {
                    console.error('Failed to retrieve Stripe subscription:', error);
                }
            }

            return {
                ...profile,
                is_active: profile.subscription_tier !== 'free',
                stripe_subscription: null
            };
        } catch (error) {
            console.error('Failed to get user subscription:', error);
            return null;
        }
    }

    /**
     * Cancel user subscription
     */
    async cancelSubscription(userId) {
        try {
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('stripe_subscription_id')
                .eq('id', userId)
                .single();
                
            if (!profile?.stripe_subscription_id) {
                throw new Error('No active subscription found');
            }

            // Cancel at period end (don't immediately revoke access)
            const subscription = await stripe.subscriptions.update(
                profile.stripe_subscription_id,
                { cancel_at_period_end: true }
            );

            console.log(`✅ Scheduled cancellation for user ${userId} at period end`);
            return subscription;
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }

    /**
     * Create a subscription with payment method (for integrated modal)
     */
    async createSubscriptionWithPaymentMethod(userId, paymentMethodId, priceId, email) {
        try {
            // Get user profile
            const { data: profile } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (!profile) {
                throw new Error('User profile not found');
            }

            // Get or create Stripe customer
            let customerId = profile.stripe_customer_id;
            if (!customerId) {
                const customer = await this.createStripeCustomer({
                    id: userId,
                    email: email || profile.email || `user-${userId}@example.com`,
                    profile
                });
                customerId = customer.id;
            }

            // Attach payment method to customer
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId,
            });

            // Set as default payment method
            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            // Create subscription
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{
                    price: priceId,
                }],
                default_payment_method: paymentMethodId,
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    supabase_user_id: userId
                }
            });

            console.log(`✅ Created subscription: ${subscription.id} for user ${userId}`);

            // Check if payment requires action (3D Secure)
            const invoice = subscription.latest_invoice;
            const paymentIntent = invoice.payment_intent;

            if (paymentIntent.status === 'requires_action') {
                return {
                    requires_action: true,
                    payment_intent_client_secret: paymentIntent.client_secret,
                    subscription_id: subscription.id
                };
            } else if (paymentIntent.status === 'succeeded') {
                // Update user subscription in database
                const tierName = this.getTierFromPriceId(priceId);
                await this.updateUserSubscription(userId, {
                    subscription_tier: tierName,
                    stripe_subscription_id: subscription.id,
                    subscription_status: subscription.status,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                });

                return {
                    success: true,
                    subscription_id: subscription.id,
                    subscription_status: subscription.status
                };
            } else {
                throw new Error(`Payment failed with status: ${paymentIntent.status}`);
            }
        } catch (error) {
            console.error('Failed to create subscription with payment method:', error);
            throw error;
        }
    }
}

module.exports = StripePaymentService; 