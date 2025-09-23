#!/bin/bash

# Pro Upscaler - Clean Startup Script
# Kills all existing HTTP servers and starts the client server correctly

echo "🚀 Pro Upscaler - Clean Startup Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Step 1: Kill all existing HTTP servers
print_info "Killing all existing HTTP servers..."

# Kill Python HTTP servers
if pgrep -f "python.*http.server" > /dev/null; then
    pkill -f "python.*http.server"
    print_status "Killed Python HTTP servers"
else
    print_info "No Python HTTP servers running"
fi

# Kill Node.js servers (Vite, etc.)
if pgrep -f "node.*vite\|node.*dev" > /dev/null; then
    pkill -f "node.*vite\|node.*dev"
    print_status "Killed Node.js development servers"
else
    print_info "No Node.js development servers running"
fi

# Kill any other HTTP servers on common ports
for port in 3000 3001 5173 8080 8081 8082; do
    if lsof -ti:$port > /dev/null 2>&1; then
        print_warning "Killing process on port $port"
        kill -9 $(lsof -ti:$port) 2>/dev/null || true
    fi
done

print_status "All HTTP servers stopped"

# Step 2: Wait a moment for ports to be released
sleep 2

# Step 3: Navigate to the correct directory
CLIENT_DIR="/home/mranderson/desktophybrid/pro-upscaler/client"

if [ ! -d "$CLIENT_DIR" ]; then
    print_error "Client directory not found: $CLIENT_DIR"
    exit 1
fi

cd "$CLIENT_DIR"
print_status "Changed to client directory: $CLIENT_DIR"

# Step 4: Verify required files exist
required_files=("index.html" "style.css" "quick-color-switcher.js")
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

print_status "All required files found"

# Step 5: Start the HTTP server
PORT=8080

print_info "Starting HTTP server on port $PORT..."
print_info "Client directory: $CLIENT_DIR"

# Start server in background and capture PID
python3 -m http.server $PORT > server.log 2>&1 &
SERVER_PID=$!

# Wait a moment and check if server started successfully
sleep 2

if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "HTTP server started successfully (PID: $SERVER_PID)"
    
    # Test server response
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ | grep -q "200"; then
        print_status "Server responding correctly"
    else
        print_warning "Server may not be responding correctly"
    fi
    
    echo ""
    echo "🎉 Pro Upscaler is now running!"
    echo "================================"
    echo -e "${GREEN}📱 Main Application: ${BLUE}http://localhost:$PORT/index.html${NC}"
    echo -e "${GREEN}🎨 Color Tester:     ${BLUE}http://localhost:$PORT/color-verification.html${NC}"
    echo -e "${GREEN}🧪 Connection Test:  ${BLUE}http://localhost:$PORT/test-connection.html${NC}"
    echo ""
    echo -e "${YELLOW}💡 Features:${NC}"
    echo "   • Color scheme switcher (top-left dropdown)"
    echo "   • Keyboard shortcut: Ctrl+K to cycle themes"
    echo "   • 5 different color palettes to test"
    echo ""
    echo -e "${BLUE}🛑 To stop the server: ${NC}kill $SERVER_PID"
    echo -e "${BLUE}📋 Server log:        ${NC}tail -f $CLIENT_DIR/server.log"
    echo ""
    
    # Save PID for easy killing later
    echo $SERVER_PID > server.pid
    print_info "Server PID saved to server.pid"
    
else
    print_error "Failed to start HTTP server"
    exit 1
fi

# Step 6: Optional - Open browser automatically
if command -v xdg-open > /dev/null; then
    read -p "🌐 Open browser automatically? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "http://localhost:$PORT/index.html" &
        print_status "Browser opened"
    fi
fi

echo ""
print_info "Server is running in the background. Press Ctrl+C to stop monitoring."

# Step 7: Monitor server (optional)
trap 'echo -e "\n${YELLOW}⚠️  Stopping server monitoring...${NC}"; exit 0' INT

while true; do
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        print_error "Server process died unexpectedly!"
        break
    fi
    sleep 10
done 