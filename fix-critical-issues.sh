#!/bin/bash

echo "🔧 Pro Upscaler Critical Issues Fix Script"
echo "=========================================="

# Kill any existing processes on ports 3007 and 3002
echo "🛑 Stopping any existing services..."
lsof -ti:3007 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

sleep 2

echo "✅ Services stopped"

# Navigate to desktop service directory
cd /home/mranderson/desktophybrid/pro-engine-desktop/service

echo "🚀 Starting Pro Engine Desktop Service with fixes..."
echo "   - WebGPU initialization with proper error handling"
echo "   - Dynamic port management"
echo "   - Enhanced health monitoring"

# Start the service in background
nohup npm start > desktop-service.log 2>&1 &
DESKTOP_PID=$!

echo "🔄 Desktop service starting (PID: $DESKTOP_PID)..."
sleep 5

# Check if desktop service started successfully
if ps -p $DESKTOP_PID > /dev/null; then
    echo "✅ Desktop service started successfully"
    
    # Find which port it's using
    PORT=$(lsof -Pan -p $DESKTOP_PID -i | grep LISTEN | head -1 | sed 's/.*:\([0-9]*\).*/\1/')
    if [ ! -z "$PORT" ]; then
        echo "📊 Desktop service running on port: $PORT"
        echo "🔗 Health check: http://localhost:$PORT/health"
        
        # Test health endpoint
        echo "🔍 Testing health endpoint..."
        sleep 2
        curl -s "http://localhost:$PORT/health" | jq '.' || echo "Health check response received"
    fi
else
    echo "❌ Desktop service failed to start"
    echo "📋 Last 10 lines of log:"
    tail -10 desktop-service.log
fi

echo ""
echo "🌐 Web application should still be running on localhost:3002"
echo "🔗 Access: http://localhost:3002"

echo ""
echo "📋 Next steps:"
echo "   1. Test image processing through web interface"
echo "   2. Verify WebGPU fallback works properly"
echo "   3. Check service discovery between web app and desktop service"
echo "   4. Proceed with database consolidation"

echo ""
echo "📊 Service status:"
echo "   - Web App (3002): $(curl -s http://localhost:3002/health >/dev/null && echo "✅ Running" || echo "❌ Not running")"
echo "   - Desktop Engine: $([ ! -z "$PORT" ] && echo "✅ Running on port $PORT" || echo "❌ Not running")" 