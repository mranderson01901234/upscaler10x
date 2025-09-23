#!/bin/bash

# Pro Upscaler - Simple Launcher
# Quick start script for development

echo "🚀 Starting Pro Upscaler..."

# Kill any existing servers
pkill -f "python.*http.server" 2>/dev/null || true
sleep 1

# Start server from client directory
cd /home/mranderson/desktophybrid/pro-upscaler/client
python3 -m http.server 8080 > /dev/null 2>&1 &
SERVER_PID=$!

# Wait and test
sleep 2

if curl -s -o /dev/null http://localhost:8080/index.html; then
    echo "✅ Pro Upscaler is running!"
    echo ""
    echo "🎨 Main Application (with color switcher):"
    echo "   http://localhost:8080/index.html"
    echo ""
    echo "📋 Features:"
    echo "   • Color scheme dropdown (top-left corner)"
    echo "   • Press Ctrl+K to cycle through themes"
    echo "   • 5 different color palettes available"
    echo ""
    echo "🛑 To stop: kill $SERVER_PID"
    echo ""
else
    echo "❌ Failed to start server"
    exit 1
fi 