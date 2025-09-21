#!/bin/bash

# Pro Upscaler Stop All Script
# Quickly kills all running services

echo "🛑 Stopping All Pro Upscaler Services..."
echo "========================================"

# Function to kill processes safely
kill_process() {
    local process_name="$1"
    local pids=$(pgrep -f "$process_name" 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "🔪 Killing $process_name processes: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function to kill processes by port
kill_port() {
    local port="$1"
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "🔪 Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Kill specific processes
kill_process "node server.js"
kill_process "PORT=3002"
kill_process "PORT=3003" 
kill_process "PORT=3004"
kill_process "PORT=3005"
kill_process "PORT=3006"
kill_process "python3 -m http.server"
kill_process "pro-upscaler"
kill_process "pro-engine"

# Kill by ports
kill_port 3002
kill_port 3003
kill_port 3004
kill_port 3005
kill_port 3006
kill_port 8080

echo "⏳ Waiting for processes to terminate..."
sleep 2

echo "✅ All services stopped!"
echo ""
echo "🚀 To start fresh environment:"
echo "   ./start-fresh.sh" 