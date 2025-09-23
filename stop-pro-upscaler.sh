#!/bin/bash

# Pro Upscaler - Stop Script
# Cleanly stops all Pro Upscaler servers

echo "🛑 Stopping Pro Upscaler servers..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Stop server using saved PID if available
CLIENT_DIR="/home/mranderson/desktophybrid/pro-upscaler/client"
if [ -f "$CLIENT_DIR/server.pid" ]; then
    PID=$(cat "$CLIENT_DIR/server.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        print_status "Stopped server (PID: $PID)"
        rm -f "$CLIENT_DIR/server.pid"
    else
        print_info "Server PID $PID not running"
        rm -f "$CLIENT_DIR/server.pid"
    fi
fi

# Kill all Python HTTP servers
if pgrep -f "python.*http.server" > /dev/null; then
    pkill -f "python.*http.server"
    print_status "Killed all Python HTTP servers"
fi

# Kill Node.js servers
if pgrep -f "node.*vite\|node.*dev" > /dev/null; then
    pkill -f "node.*vite\|node.*dev"
    print_status "Killed Node.js development servers"
fi

# Kill processes on specific ports
for port in 3000 3001 5173 8080 8081 8082; do
    if lsof -ti:$port > /dev/null 2>&1; then
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
        print_status "Freed port $port"
    fi
done

print_status "All Pro Upscaler servers stopped" 