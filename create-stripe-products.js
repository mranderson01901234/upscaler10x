#!/usr/bin/env node

/**
 * Create Stripe Products and Prices
 * Sets up Pro Upscaler subscription products in Stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
    console.log('🔧 SETTING UP STRIPE PRODUCTS');
    console.log('============================');
    
    try {
        // Create Basic Plan Product
        console.log('\n1️⃣ Creating Basic Plan...');
        const basicProduct = await stripe.products.create({
            name: 'Pro Upscaler Basic',
            description: 'Basic image upscaling with up to 8x enhancement and 50 AI enhancements per month',
            metadata: {
                tier: 'basic',
                features: 'up-to-8x,unlimited-2x-8x,ai-50-monthly,priority-support'
            }
        });
        
        const basicPrice = await stripe.prices.create({
            product: basicProduct.id,
            unit_amount: 999, // $9.99
            currency: 'usd',
            recurring: {
                interval: 'month'
            },
            metadata: {
                tier: 'basic'
            }
        });
        
        console.log(`✅ Basic Product ID: ${basicProduct.id}`);
        console.log(`✅ Basic Price ID: ${basicPrice.id}`);
        
        // Create Pro Plan Product
        console.log('\n2️⃣ Creating Pro Plan...');
        const proProduct = await stripe.products.create({
            name: 'Pro Upscaler Pro',
            description: 'Professional image upscaling with up to 15x enhancement and unlimited AI enhancements',
            metadata: {
                tier: 'pro',
                features: 'up-to-15x,unlimited-processing,unlimited-ai,premium-support,early-access'
            }
        });
        
        const proPrice = await stripe.prices.create({
            product: proProduct.id,
            unit_amount: 1999, // $19.99
            currency: 'usd',
            recurring: {
                interval: 'month'
            },
            metadata: {
                tier: 'pro'
            }
        });
        
        console.log(`✅ Pro Product ID: ${proProduct.id}`);
        console.log(`✅ Pro Price ID: ${proPrice.id}`);
        
        // Update the payment service configuration
        console.log('\n3️⃣ Updating payment service configuration...');
        
        const configUpdate = `
// Updated Stripe configuration with your actual Price IDs
this.priceIds = {
    basic: '${basicPrice.id}',     // $9.99/month - Pro Upscaler Basic
    pro: '${proPrice.id}',         // $19.99/month - Pro Upscaler Pro
};`;

        console.log('\n🎯 STRIPE SETUP COMPLETE!');
        console.log('=========================');
        console.log('📋 Copy these Price IDs to your stripe-payment-service.js:');
        console.log(`Basic Price ID: ${basicPrice.id}`);
        console.log(`Pro Price ID: ${proPrice.id}`);
        
        console.log('\n🔧 Configuration to update:');
        console.log(configUpdate);
        
        return {
            basic: {
                productId: basicProduct.id,
                priceId: basicPrice.id
            },
            pro: {
                productId: proProduct.id,
                priceId: proPrice.id
            }
        };
        
    } catch (error) {
        console.error('❌ Failed to create Stripe products:', error.message);
        throw error;
    }
}

// Run the setup
if (require.main === module) {
    createStripeProducts()
        .then((products) => {
            console.log('\n✅ Products created successfully!');
            console.log('🔗 View in Stripe Dashboard: https://dashboard.stripe.com/test/products');
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

module.exports = createStripeProducts; 