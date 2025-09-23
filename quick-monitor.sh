#!/bin/bash

# Quick Pro Engine Desktop Service Log Monitor
# Shows real-time processing output from the Pro Engine

echo "🚀 Pro Engine Desktop Service - Live Processing Monitor"
echo "======================================================"
echo "Monitoring port 3007 for image processing activity..."
echo "Press Ctrl+C to exit"
echo ""

# Get the process ID for port 3007
PID=$(lsof -ti:3007 2>/dev/null | head -1)

if [ -z "$PID" ]; then
    echo "❌ Pro Engine Desktop Service is not running on port 3007"
    echo ""
    echo "To start it:"
    echo "cd /home/mranderson/desktophybrid/pro-engine-desktop/service && PORT=3007 node --expose-gc --max-old-space-size=8192 server.js &"
    exit 1
fi

echo "✅ Found Pro Engine process (PID: $PID)"
echo "📊 Showing live processing logs..."
echo ""

# Monitor the logs
tail -f /proc/$PID/fd/1 2>/dev/null || {
    echo "⚠️  Could not access process logs directly."
    echo ""
    echo "Alternative commands you can try:"
    echo "1. journalctl -f (if using systemd)"
    echo "2. ps aux | grep $PID (to see process info)"
    echo "3. Monitor network activity: watch -n 1 'netstat -an | grep 3007'"
} 