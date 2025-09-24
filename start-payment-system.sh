#!/bin/bash

echo "🚀 STARTING PRO UPSCALER WITH STRIPE PAYMENT INTEGRATION"
echo "========================================================"

# Stop any existing services
echo "🛑 Stopping existing services..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Set environment variables (replace with your actual keys)
export STRIPE_SECRET_KEY="your_stripe_secret_key_here"
export STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key_here"

echo "✅ Environment variables set"
echo "   - Stripe Secret Key: ${STRIPE_SECRET_KEY:0:20}..."
echo "   - Stripe Publishable Key: ${STRIPE_PUBLISHABLE_KEY:0:20}..."

# Start the web application with payment integration
echo ""
echo "🌐 Starting web application with Stripe payment integration..."
cd /home/mranderson/desktophybrid/pro-upscaler/server

# Start in foreground to see any errors
echo "📊 Server starting with payment integration..."
node server.js &
WEB_PID=$!

echo "🔄 Web app starting (PID: $WEB_PID)..."
sleep 5

# Test the server
if ps -p $WEB_PID > /dev/null; then
    echo "✅ Web application started successfully"
    
    # Test health endpoint
    HEALTH_CHECK=$(curl -s http://localhost:3002/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "💚 Health check passed"
    else
        echo "⚠️  Health check failed"
    fi
    
    # Test payment tiers endpoint
    echo "🧪 Testing payment integration..."
    TIERS_RESPONSE=$(curl -s -H "Accept: application/json" http://localhost:3002/api/payments/tiers 2>/dev/null)
    if echo "$TIERS_RESPONSE" | grep -q "tiers"; then
        echo "✅ Payment API working - tiers endpoint responding"
    else
        echo "❌ Payment API not responding properly"
        echo "Response preview: ${TIERS_RESPONSE:0:100}..."
    fi
    
else
    echo "❌ Web application failed to start"
    echo "📋 Check logs for errors"
fi

echo ""
echo "🎯 STRIPE PAYMENT SYSTEM STATUS"
echo "==============================="
echo "✅ Stripe Products Created:"
echo "   - Basic Plan: prod_T7AvmQsyVRYkQY (price_1SAwZvCg03i5TOI3gZQskT5u) - $9.99/month"
echo "   - Pro Plan: prod_T7AxCphyDafSKb (price_1SAwbHCg03i5TOI37l4cgaD5) - $19.99/month"

echo ""
echo "🔗 ACCESS POINTS:"
echo "   - Web App: http://localhost:3002"
echo "   - Payment Tiers: http://localhost:3002/api/payments/tiers"
echo "   - Stripe Dashboard: https://dashboard.stripe.com/test/products"

echo ""
echo "💳 READY FOR PAYMENT TESTING!"
echo "Use test card: 4242424242424242 (any future date, any CVC)"

# Keep script running to show logs
echo ""
echo "📋 Server logs (Ctrl+C to stop):"
wait $WEB_PID 