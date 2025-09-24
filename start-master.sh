#!/bin/bash

# Pro Upscaler - Master Startup Script
# Starts all services in the correct order for AI-enhanced image upscaling

echo "🚀 Pro Upscaler - Master Startup Script"
echo "========================================"
echo "Starting all services for AI-enhanced image upscaling..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
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

print_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "$service_name is ready!"
            return 0
        fi
        
        if [ $((attempt % 5)) -eq 0 ]; then
            print_info "Still waiting for $service_name... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 1
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start after $max_attempts seconds"
    return 1
}

# Step 1: Clean up any existing processes
print_step "Step 1: Cleaning up existing processes"

# Kill existing processes
/usr/bin/pkill -f "python.*http.server" 2>/dev/null && print_info "Stopped Python HTTP servers" || print_info "No Python HTTP servers running"
/usr/bin/pkill -f "node.*server.js" 2>/dev/null && print_info "Stopped Node.js servers" || print_info "No Node.js servers running"

# Kill processes on specific ports
for port in 3007 3002 8080; do
    if lsof -ti:$port >/dev/null 2>&1; then
        print_warning "Killing process on port $port"
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
        sleep 1
    fi
done

print_status "Cleanup complete"
echo ""

# Step 2: Start Pro Engine Desktop Service (port 3007)
print_step "Step 2: Starting Pro Engine Desktop Service (AI Processing)"

if ! check_port 3007; then
    print_error "Port 3007 is still in use"
    exit 1
fi

print_info "Starting Pro Engine Desktop Service on port 3007..."
cd /home/mranderson/desktophybrid/pro-engine-desktop/service

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Installing dependencies for Pro Engine Desktop Service..."
    npm install
fi

# Start service in background
npm start > /tmp/pro-engine-desktop.log 2>&1 &
DESKTOP_PID=$!

# Wait for service to be ready
if wait_for_service "http://localhost:3007/health" "Pro Engine Desktop Service"; then
    print_status "Pro Engine Desktop Service started (PID: $DESKTOP_PID)"
    echo $DESKTOP_PID > /tmp/pro-engine-desktop.pid
else
    print_error "Failed to start Pro Engine Desktop Service"
    exit 1
fi

echo ""

# Step 3: Start Pro Upscaler Server (port 3002)
print_step "Step 3: Starting Pro Upscaler Server (API & Database)"

if ! check_port 3002; then
    print_error "Port 3002 is still in use"
    exit 1
fi

print_info "Starting Pro Upscaler Server on port 3002..."
cd /home/mranderson/desktophybrid/pro-upscaler/server

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Installing dependencies for Pro Upscaler Server..."
    npm install
fi

# Start service in background
npm start > /tmp/pro-upscaler-server.log 2>&1 &
SERVER_PID=$!

# Wait for service to be ready
if wait_for_service "http://localhost:3002/health" "Pro Upscaler Server"; then
    print_status "Pro Upscaler Server started (PID: $SERVER_PID)"
    echo $SERVER_PID > /tmp/pro-upscaler-server.pid
else
    print_error "Failed to start Pro Upscaler Server"
    exit 1
fi

echo ""

# Step 4: Start Pro Upscaler Client (port 8080)
print_step "Step 4: Starting Pro Upscaler Client (Web Interface)"

if ! check_port 8080; then
    print_error "Port 8080 is still in use"
    exit 1
fi

print_info "Starting Pro Upscaler Client on port 8080..."
cd /home/mranderson/desktophybrid/pro-upscaler/client

# Verify required files exist
required_files=("index.html" "style.css" "js/main.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    print_error "Missing required files: ${missing_files[*]}"
    exit 1
fi

# Start HTTP server in background
python3 -m http.server 8080 > /tmp/pro-upscaler-client.log 2>&1 &
CLIENT_PID=$!

# Wait for service to be ready
if wait_for_service "http://localhost:8080/index.html" "Pro Upscaler Client"; then
    print_status "Pro Upscaler Client started (PID: $CLIENT_PID)"
    echo $CLIENT_PID > /tmp/pro-upscaler-client.pid
else
    print_error "Failed to start Pro Upscaler Client"
    exit 1
fi

echo ""

# Step 5: Verify all services are communicating
print_step "Step 5: Verifying service communication"

print_info "Testing Pro Engine Desktop Service capabilities..."
if curl -s "http://localhost:3007/" | grep -q "Pro Engine Desktop Service"; then
    print_status "Pro Engine Desktop Service responding correctly"
else
    print_warning "Pro Engine Desktop Service may have issues"
fi

print_info "Testing Pro Upscaler Server health..."
if curl -s "http://localhost:3002/health" | grep -q "healthy"; then
    print_status "Pro Upscaler Server responding correctly"
else
    print_warning "Pro Upscaler Server may have issues"
fi

print_info "Testing service communication (Server → Desktop Service)..."
if curl -s -X POST "http://localhost:3002/api/process-with-ai" \
   -H "Content-Type: application/json" \
   -d '{"test": true}' | grep -q "Missing required parameters"; then
    print_status "Service communication working correctly"
else
    print_warning "Service communication may have issues"
fi

echo ""

# Step 6: Display startup summary
print_step "🎉 Pro Upscaler System Successfully Started!"

echo ""
echo "📊 System Status:"
echo "=================="
echo -e "${GREEN}🖥️  Pro Engine Desktop Service:${NC} Running on port 3007 (PID: $DESKTOP_PID)"
echo -e "${GREEN}🌐 Pro Upscaler Server:${NC}        Running on port 3002 (PID: $SERVER_PID)"
echo -e "${GREEN}📱 Pro Upscaler Client:${NC}        Running on port 8080 (PID: $CLIENT_PID)"
echo ""

echo "🌐 Access Points:"
echo "================="
echo -e "${BLUE}📱 Main Application:${NC}     http://localhost:8080/index.html"
echo -e "${BLUE}🎨 Color Tester:${NC}         http://localhost:8080/color-verification.html"
echo -e "${BLUE}🧪 Connection Test:${NC}      http://localhost:8080/test-connection.html"
echo -e "${BLUE}🔧 Server API:${NC}           http://localhost:3002/health"
echo -e "${BLUE}⚙️  Desktop Service:${NC}     http://localhost:3007/health"
echo ""

echo "✨ Features Available:"
echo "====================="
echo "   • 🤖 AI-Enhanced Upscaling (CodeFormer + GPU acceleration)"
echo "   • 🎨 Multiple color schemes with Ctrl+K shortcut"
echo "   • 📊 Real-time processing progress"
echo "   • 🖼️  Side-by-side comparison view"
echo "   • 💾 High-resolution download (up to 1.5GB files)"
echo "   • 🔐 User authentication & subscription management"
echo ""

echo "🛠️  Management:"
echo "=============="
echo -e "${YELLOW}🛑 Stop all services:${NC}    ./stop-all.sh"
echo -e "${YELLOW}📋 View logs:${NC}            tail -f /tmp/pro-*.log"
echo -e "${YELLOW}📊 Monitor system:${NC}       ./monitor-logs.sh"
echo ""

echo "💡 GPU Acceleration: NVIDIA GeForce GTX 1050 (CUDA enabled)"
echo "🔧 Max file size: 1.5GB | Max output: 39MP+ images"
echo ""

# Save all PIDs for easy management
cat > /tmp/pro-upscaler-pids.txt << EOF
# Pro Upscaler System PIDs
DESKTOP_PID=$DESKTOP_PID
SERVER_PID=$SERVER_PID
CLIENT_PID=$CLIENT_PID

# To stop all services:
# kill $DESKTOP_PID $SERVER_PID $CLIENT_PID
EOF

print_status "All service PIDs saved to /tmp/pro-upscaler-pids.txt"

# Optional: Open browser
if command -v xdg-open > /dev/null; then
    echo ""
    read -p "🌐 Open browser automatically? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "http://localhost:8080/index.html" &
        print_status "Browser opened"
    fi
fi

echo ""
print_info "System is running! Press Ctrl+C to stop monitoring or use ./stop-all.sh to stop all services."

# Monitor services (optional)
trap 'echo -e "\n${YELLOW}⚠️  Stopping service monitoring...${NC}"; exit 0' INT

while true; do
    # Check if all services are still running
    all_running=true
    
    if ! kill -0 $DESKTOP_PID 2>/dev/null; then
        print_error "Pro Engine Desktop Service (PID: $DESKTOP_PID) has stopped!"
        all_running=false
    fi
    
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "Pro Upscaler Server (PID: $SERVER_PID) has stopped!"
        all_running=false
    fi
    
    if ! kill -0 $CLIENT_PID 2>/dev/null; then
        print_error "Pro Upscaler Client (PID: $CLIENT_PID) has stopped!"
        all_running=false
    fi
    
    if [ "$all_running" = false ]; then
        print_error "One or more services have stopped unexpectedly!"
        break
    fi
    
    sleep 30
done 