#!/bin/bash

# Pro Upscaler - System Status Check
# Quick status overview of all services

echo "📊 Pro Upscaler - System Status"
echo "==============================="

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

# Function to check service status
check_service() {
    local port=$1
    local name=$2
    local url=$3
    
    if lsof -i:$port > /dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "$name: Running on port $port (PID: $pid) - Responding"
        else
            print_warning "$name: Running on port $port (PID: $pid) - Not responding"
        fi
    else
        print_error "$name: Not running (port $port available)"
    fi
}

echo ""
echo "🔍 Service Status:"
echo "=================="

check_service 3007 "Pro Engine Desktop Service" "http://localhost:3007/health"
check_service 3002 "Pro Upscaler Server" "http://localhost:3002/health"
check_service 8080 "Pro Upscaler Client" "http://localhost:8080/index.html"

echo ""
echo "🔗 Service Communication:"
echo "========================="

# Test communication between services
if curl -s -f "http://localhost:3002/health" >/dev/null 2>&1 && curl -s -f "http://localhost:3007/health" >/dev/null 2>&1; then
    if curl -s -X POST "http://localhost:3002/api/process-with-ai" \
       -H "Content-Type: application/json" \
       -d '{"test": true}' | grep -q "Missing required parameters"; then
        print_status "Server ↔ Desktop Service: Communication working"
    else
        print_warning "Server ↔ Desktop Service: Communication may have issues"
    fi
else
    print_error "Server ↔ Desktop Service: One or both services not responding"
fi

echo ""
echo "💾 System Resources:"
echo "===================="

# Check system resources
if command -v free >/dev/null 2>&1; then
    memory_info=$(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')
    print_info "Memory Usage: $memory_info"
fi

if [ -d "/proc" ]; then
    cpu_count=$(nproc)
    load_avg=$(cat /proc/loadavg | cut -d' ' -f1-3)
    print_info "CPU Cores: $cpu_count | Load Average: $load_avg"
fi

# Check disk space for output directory
if [ -d "/home/mranderson/Downloads/ProUpscaler" ]; then
    disk_usage=$(df -h /home/mranderson/Downloads/ProUpscaler | tail -1 | awk '{print $4}')
    print_info "Available disk space: $disk_usage"
fi

echo ""
echo "🌐 Access URLs:"
echo "==============="
if lsof -i:8080 > /dev/null 2>&1; then
    echo -e "${BLUE}📱 Main Application:${NC}     http://localhost:8080/index.html"
    echo -e "${BLUE}🎨 Color Tester:${NC}         http://localhost:8080/color-verification.html"
    echo -e "${BLUE}🧪 Connection Test:${NC}      http://localhost:8080/test-connection.html"
else
    print_error "Web interface not available - Client not running"
fi

if lsof -i:3002 > /dev/null 2>&1; then
    echo -e "${BLUE}🔧 Server API:${NC}           http://localhost:3002/health"
else
    print_error "Server API not available"
fi

if lsof -i:3007 > /dev/null 2>&1; then
    echo -e "${BLUE}⚙️  Desktop Service:${NC}     http://localhost:3007/health"
else
    print_error "Desktop Service not available"
fi

echo ""
echo "🛠️  Management Commands:"
echo "========================"
echo -e "${YELLOW}🚀 Start all services:${NC}    ./start-master.sh"
echo -e "${YELLOW}🛑 Stop all services:${NC}     ./stop-master.sh"
echo -e "${YELLOW}📋 View logs:${NC}             tail -f /tmp/pro-*.log"
echo -e "${YELLOW}📊 System status:${NC}         ./status.sh"

# Check if PID file exists
if [ -f "/tmp/pro-upscaler-pids.txt" ]; then
    echo ""
    print_info "PID file found: /tmp/pro-upscaler-pids.txt"
    echo "   Services were started with ./start-master.sh"
else
    echo ""
    print_warning "No PID file found"
    echo "   Services may have been started manually"
fi

echo "" 