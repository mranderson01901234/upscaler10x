#!/bin/bash

# Pro Upscaler - Master Stop Script
# Stops all services started by start-master.sh

echo "🛑 Pro Upscaler - Master Stop Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to stop service gracefully
stop_service() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        print_info "Stopping $name (PID: $pid)..."
        kill "$pid" 2>/dev/null
        
        # Wait up to 10 seconds for graceful shutdown
        local count=0
        while [ $count -lt 10 ] && kill -0 "$pid" 2>/dev/null; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "Force killing $name (PID: $pid)..."
            kill -9 "$pid" 2>/dev/null
        fi
        
        print_status "$name stopped"
    else
        print_info "$name not running or already stopped"
    fi
}

# Method 1: Stop using saved PIDs
if [ -f "/tmp/pro-upscaler-pids.txt" ]; then
    print_info "Found PID file, stopping services gracefully..."
    
    # Source the PID file to get the PIDs
    source /tmp/pro-upscaler-pids.txt
    
    stop_service "$CLIENT_PID" "Pro Upscaler Client"
    stop_service "$SERVER_PID" "Pro Upscaler Server"
    stop_service "$DESKTOP_PID" "Pro Engine Desktop Service"
    
    # Clean up PID files
    rm -f /tmp/pro-upscaler-pids.txt
    rm -f /tmp/pro-engine-desktop.pid
    rm -f /tmp/pro-upscaler-server.pid
    rm -f /tmp/pro-upscaler-client.pid
    
    print_status "PID files cleaned up"
else
    print_warning "No PID file found, using fallback method..."
fi

# Method 2: Fallback - Kill by process pattern
print_info "Stopping any remaining processes..."

# Stop Python HTTP servers
if pgrep -f "python.*http.server" > /dev/null; then
    pkill -f "python.*http.server"
    print_status "Stopped Python HTTP servers"
else
    print_info "No Python HTTP servers running"
fi

# Stop Node.js servers
if pgrep -f "node.*server.js" > /dev/null; then
    pkill -f "node.*server.js"
    print_status "Stopped Node.js servers"
else
    print_info "No Node.js servers running"
fi

# Method 3: Kill by port (last resort)
print_info "Checking for processes on specific ports..."

for port in 3007 3002 8080; do
    if lsof -ti:$port > /dev/null 2>&1; then
        print_warning "Force killing process on port $port"
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done

# Clean up log files (optional)
if [ -f "/tmp/pro-engine-desktop.log" ] || [ -f "/tmp/pro-upscaler-server.log" ] || [ -f "/tmp/pro-upscaler-client.log" ]; then
    read -p "🗑️  Remove log files? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f /tmp/pro-engine-desktop.log
        rm -f /tmp/pro-upscaler-server.log
        rm -f /tmp/pro-upscaler-client.log
        print_status "Log files removed"
    else
        print_info "Log files kept in /tmp/"
    fi
fi

# Verify all services are stopped
echo ""
print_info "Verifying all services are stopped..."

all_stopped=true

if lsof -i:3007 > /dev/null 2>&1; then
    print_error "Port 3007 still in use"
    all_stopped=false
fi

if lsof -i:3002 > /dev/null 2>&1; then
    print_error "Port 3002 still in use"
    all_stopped=false
fi

if lsof -i:8080 > /dev/null 2>&1; then
    print_error "Port 8080 still in use"
    all_stopped=false
fi

if [ "$all_stopped" = true ]; then
    echo ""
    print_status "All Pro Upscaler services stopped successfully!"
    echo ""
    print_info "To start the system again, run: ./start-master.sh"
else
    echo ""
    print_warning "Some services may still be running. Check manually with:"
    echo "  lsof -i:3007 -i:3002 -i:8080"
fi

echo "" 