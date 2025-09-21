#!/bin/bash

echo "🚀 Starting Pro Upscaler Server..."

# Navigate to the server directory
cd "$(dirname "$0")/server"

# Kill any existing processes on port 3002
echo "Stopping any existing servers..."
pkill -f "node server.js" 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Start the server
echo "Starting server..."
node server.js 