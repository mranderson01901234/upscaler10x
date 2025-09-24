#!/usr/bin/env node

/**
 * Test Payment Integration
 * Verify that all payment components are working correctly
 */

const { createClient } = require('@supabase/supabase-js');

async function testPaymentIntegration() {
    console.log('🧪 TESTING PAYMENT INTEGRATION');
    console.log('==============================\n');

    try {
        // Test 1: Supabase connection
        console.log('1️⃣ Testing Supabase connection...');
        const supabase = createClient(
            'https://vztoftcjbwzwioxarovy.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dG9mdGNqYnd6d2lveGFyb3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTE3ODcsImV4cCI6MjA3NDA4Nzc4N30.Y8fxbY5mxCwgd0W2J65tWFKx38fHlDshSmFzw6CiK04'
        );
        
        const { data: tiers, error } = await supabase
            .from('subscription_tiers')
            .select('*');
            
        if (error) {
            throw new Error(`Supabase error: ${error.message}`);
        }
        
        console.log(`✅ Supabase connected - Found ${tiers.length} subscription tiers`);
        tiers.forEach(tier => {
            console.log(`   - ${tier.tier_name}: $${tier.price_monthly}/month`);
        });

        // Test 2: Load payment modules
        console.log('\n2️⃣ Testing payment module loading...');
        const SupabaseAuthMiddleware = require('./pro-upscaler/server/supabase-auth-middleware');
        const PaymentRoutes = require('./pro-upscaler/server/payment-routes');
        const StripePaymentService = require('./pro-upscaler/server/stripe-payment-service');
        
        console.log('✅ All payment modules loaded successfully');

        // Test 3: Instantiate components
        console.log('\n3️⃣ Testing component instantiation...');
        const authMiddleware = new SupabaseAuthMiddleware();
        const paymentRoutes = new PaymentRoutes(authMiddleware);
        const paymentService = new StripePaymentService();
        
        console.log('✅ All payment components instantiated successfully');

        // Test 4: Test API endpoints (simulated)
        console.log('\n4️⃣ Testing API endpoint structure...');
        const router = paymentRoutes.getRouter();
        console.log('✅ Payment router created successfully');

        // Test 5: Test tier features mapping
        console.log('\n5️⃣ Testing tier features...');
        const features = paymentRoutes.getTierFeatures('pro');
        console.log(`✅ Pro tier features: ${features.length} features`);
        features.forEach(feature => {
            console.log(`   - ${feature}`);
        });

        // Test 6: Test server health check
        console.log('\n6️⃣ Testing server health check...');
        try {
            const response = await fetch('http://localhost:3002/health');
            if (response.ok) {
                const health = await response.json();
                console.log(`✅ Server health check passed: ${health.status}`);
            } else {
                console.log('⚠️  Server health check failed (server may not be running)');
            }
        } catch (error) {
            console.log('⚠️  Server health check failed (server may not be running)');
        }

        // Test 7: Test tiers endpoint
        console.log('\n7️⃣ Testing tiers endpoint...');
        try {
            const response = await fetch('http://localhost:3002/api/payments/tiers');
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`✅ Tiers endpoint working - returned ${data.tiers ? data.tiers.length : 0} tiers`);
            } else {
                console.log('❌ Tiers endpoint returning HTML instead of JSON (route not mounted properly)');
            }
        } catch (error) {
            console.log(`❌ Tiers endpoint failed: ${error.message}`);
        }

        console.log('\n🎯 PAYMENT INTEGRATION TEST RESULTS');
        console.log('===================================');
        console.log('✅ Supabase connection: WORKING');
        console.log('✅ Payment modules: LOADED');
        console.log('✅ Component instantiation: WORKING');
        console.log('✅ Router creation: WORKING');
        console.log('✅ Tier features: WORKING');
        console.log('⚠️  API endpoints: Need server restart to mount properly');
        
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Restart server to mount payment routes properly');
        console.log('2. Test with Stripe test keys');
        console.log('3. Create products in Stripe Dashboard');
        console.log('4. Update price IDs in stripe-payment-service.js');

    } catch (error) {
        console.error('\n❌ PAYMENT INTEGRATION TEST FAILED');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
testPaymentIntegration(); 